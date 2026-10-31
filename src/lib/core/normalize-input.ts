import { RunError } from "./errors";
import type { PackageReference } from "./types";

const DEFAULT_VERSION_SPEC = "latest";

const MAX_NAME_LENGTH = 214;

/**
 * Names are lowercase URL-safe segments: letters, digits, `-`, `_` and `.`.
 * The first character must not be `.` or `_` (npm's own rule).
 */
const NAME_SEGMENT_PATTERN = /^[a-z0-9.-][a-z0-9._-]*$/;

const PROTOCOL_PATTERN =
	/^(?:(?:file|link|workspace|git|https?|npm|github|gitlab|bitbucket|gist):|git\+)/i;

function invalidInput(message: string): RunError {
	return new RunError({ stage: "prepare", message });
}

function invalidName(name: string): RunError {
	return invalidInput(`Invalid package name "${name}".`);
}

function isNameSegment(segment: string): boolean {
	return (
		segment.length > 0 &&
		!segment.startsWith(".") &&
		!segment.startsWith("_") &&
		NAME_SEGMENT_PATTERN.test(segment)
	);
}

function assertRegistrySpec(
	value: string,
	label: "package name" | "version spec",
): void {
	if (PROTOCOL_PATTERN.test(value)) {
		throw invalidInput(
			`Unsupported ${label} "${value}": only registry specs are accepted.`,
		);
	}
}

/**
 * Validate and return a single npm package name.
 *
 * Scoped names keep their `@scope/` prefix. Names are not URL-decoded or
 * otherwise rewritten; whitespace is only trimmed at the edges.
 */
export function normalizePackageName(name: string): string {
	const trimmed = typeof name === "string" ? name.trim() : "";

	if (trimmed.length === 0) {
		throw invalidInput("A package name is required.");
	}

	if (trimmed.length > MAX_NAME_LENGTH) {
		throw invalidName(trimmed);
	}

	assertRegistrySpec(trimmed, "package name");

	if (trimmed.startsWith("@")) {
		const slashIndex = trimmed.indexOf("/");

		if (slashIndex <= 1 || trimmed.includes("/", slashIndex + 1)) {
			throw invalidName(trimmed);
		}

		const scope = trimmed.slice(1, slashIndex);
		const packageName = trimmed.slice(slashIndex + 1);

		if (!isNameSegment(scope) || !isNameSegment(packageName)) {
			throw invalidName(trimmed);
		}
	} else if (trimmed.includes("/") || !isNameSegment(trimmed)) {
		throw invalidName(trimmed);
	}

	return trimmed;
}

/**
 * Normalize one package reference for installation.
 *
 * A missing or blank version becomes `latest`. Invalid input is reported as a
 * `prepare` failure. The input object is never mutated.
 */
export function normalizePackageReference(input: {
	name: string;
	version?: string;
}): PackageReference {
	if (input === null || typeof input !== "object") {
		throw invalidInput("A package reference is required.");
	}

	const name = normalizePackageName(input.name);

	const rawVersion =
		typeof input.version === "string" ? input.version.trim() : "";
	const versionSpec =
		rawVersion.length === 0 ? DEFAULT_VERSION_SPEC : rawVersion;

	if (
		versionSpec.includes(":") ||
		versionSpec.includes("/") ||
		versionSpec.includes("\\") ||
		versionSpec.startsWith(".") ||
		versionSpec.startsWith("~") ||
		PROTOCOL_PATTERN.test(versionSpec)
	) {
		throw invalidInput(
			`Unsupported version spec "${versionSpec}": only registry versions, ranges, and tags are accepted.`,
		);
	}

	return { name, versionSpec };
}
