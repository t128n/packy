import { ofetch } from "ofetch";

export type RegistryVersion = {
	version: string;
	deprecated?: string;
	dist?: {
		unpackedSize?: number;
	};
};

export type RegistryPackument = {
	name: string;
	description?: string;
	"dist-tags": Record<string, string>;
	versions: Record<string, RegistryVersion>;
};

/** A lightweight result from the npm search endpoint. */
export type RegistrySearchResult = {
	name: string;
	version?: string;
	description?: string;
};

type RegistryErrorKind = "not-found" | "network" | "invalid-response";

export class RegistryError extends Error {
	readonly kind: RegistryErrorKind;
	readonly status?: number;

	constructor(
		kind: RegistryErrorKind,
		message: string,
		options: { cause?: unknown; status?: number } = {},
	) {
		super(message, { cause: options.cause });
		this.name = "RegistryError";
		this.kind = kind;
		this.status = options.status;
	}
}

const registry = ofetch.create({
	baseURL: "https://registry.npmjs.org",
	retry: 1,
	timeout: 15_000,
});

const MAX_SEARCH_SIZE = 250;
const MAX_SEARCH_TERM_LENGTH = 64;
const NUMERIC_PRERELEASE_REGEX = /^\d+$/;
const VERSION_PREFIX_REGEX = /^v/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function getStatus(error: unknown): number | undefined {
	if (!isRecord(error)) {
		return undefined;
	}

	const status = error.status ?? error.statusCode;
	return typeof status === "number" ? status : undefined;
}

function toRegistryError(error: unknown, action: string): RegistryError {
	if (error instanceof RegistryError) {
		return error;
	}

	const status = getStatus(error);

	if (status === 404) {
		return new RegistryError(
			"not-found",
			`${action} failed because the package was not found.`,
			{ cause: error, status },
		);
	}

	if (status === 429) {
		return new RegistryError(
			"network",
			`${action} was rate-limited by npm. Wait a moment and try again.`,
			{ cause: error, status },
		);
	}

	const detail = error instanceof Error ? error.message : String(error);
	const suffix = status ? ` (HTTP ${status})` : "";

	return new RegistryError(
		"network",
		`${action} failed${suffix}. ${detail}`,
		{ cause: error, status },
	);
}

/** Newest-first ordering for npm version strings. */
export function compareVersionsDesc(a: string, b: string): number {
	const left = parseVersion(a);
	const right = parseVersion(b);
	const coreLength = Math.max(left.core.length, right.core.length);

	for (let index = 0; index < coreLength; index += 1) {
		const l = left.core[index] ?? 0;
		const r = right.core[index] ?? 0;

		if (l !== r) {
			return r - l;
		}
	}

	if (left.pre.length === 0 && right.pre.length === 0) {
		return 0;
	}

	if (left.pre.length === 0) {
		return -1;
	}

	if (right.pre.length === 0) {
		return 1;
	}

	const preLength = Math.max(left.pre.length, right.pre.length);

	for (let index = 0; index < preLength; index += 1) {
		const l = left.pre[index];
		const r = right.pre[index];

		if (l === undefined) {
			return 1;
		}

		if (r === undefined) {
			return -1;
		}

		if (l === r) {
			continue;
		}

		const leftNumeric = NUMERIC_PRERELEASE_REGEX.test(l);
		const rightNumeric = NUMERIC_PRERELEASE_REGEX.test(r);

		if (leftNumeric && rightNumeric) {
			return Number(r) - Number(l);
		}

		if (leftNumeric) {
			return 1;
		}

		if (rightNumeric) {
			return -1;
		}

		return r.localeCompare(l);
	}

	return 0;
}

function parseVersion(value: string): { core: number[]; pre: string[] } {
	const clean = value.replace(VERSION_PREFIX_REGEX, "").split("+")[0] ?? "";
	const dash = clean.indexOf("-");
	const core = dash === -1 ? clean : clean.slice(0, dash);
	const pre = dash === -1 ? "" : clean.slice(dash + 1);

	return {
		core: core.split(".").map((part) => Number.parseInt(part, 10) || 0),
		pre: pre ? pre.split(".") : [],
	};
}

function normalizeVersion(version: string, value: unknown): RegistryVersion {
	const meta = isRecord(value) ? value : {};
	const dist = isRecord(meta.dist) ? meta.dist : {};
	const deprecated =
		asNonEmptyString(meta.deprecated) ??
		(meta.deprecated === true
			? "Deprecated by the package maintainer."
			: undefined);
	const unpackedSize =
		typeof dist.unpackedSize === "number" &&
		Number.isFinite(dist.unpackedSize) &&
		dist.unpackedSize >= 0
			? dist.unpackedSize
			: undefined;

	return {
		version,
		...(deprecated ? { deprecated } : {}),
		...(unpackedSize === undefined ? {} : { dist: { unpackedSize } }),
	};
}

function normalizePackument(
	name: string,
	value: unknown,
): RegistryPackument | null {
	if (!isRecord(value)) {
		return null;
	}

	const rawVersions = isRecord(value.versions) ? value.versions : null;

	if (!rawVersions) {
		return null;
	}

	const versions: Record<string, RegistryVersion> = {};

	for (const [version, meta] of Object.entries(rawVersions)) {
		if (version.trim().length === 0) {
			continue;
		}

		versions[version] = normalizeVersion(version, meta);
	}

	const versionNames = Object.keys(versions);

	if (versionNames.length === 0) {
		return null;
	}

	const distTags: Record<string, string> = {};

	if (isRecord(value["dist-tags"])) {
		for (const [tag, taggedVersion] of Object.entries(value["dist-tags"])) {
			const normalizedVersion = asNonEmptyString(taggedVersion);

			if (tag.trim().length > 0 && normalizedVersion) {
				distTags[tag] = normalizedVersion;
			}
		}
	}

	if (!distTags.latest || !Object.hasOwn(versions, distTags.latest)) {
		distTags.latest = versionNames.toSorted(compareVersionsDesc)[0] ?? "";
	}

	const normalizedName = asNonEmptyString(value.name) ?? name;
	const description = asNonEmptyString(value.description);

	return {
		name: normalizedName,
		...(description ? { description } : {}),
		"dist-tags": distTags,
		versions,
	};
}

function toSearchResult(value: unknown): RegistrySearchResult | null {
	if (!isRecord(value)) {
		return null;
	}

	const pkg = isRecord(value.package) ? value.package : null;

	if (!pkg) {
		return null;
	}

	const name = asNonEmptyString(pkg.name);

	if (!name) {
		return null;
	}

	const version = asNonEmptyString(pkg.version);
	const description = asNonEmptyString(pkg.description);

	return {
		name,
		...(version ? { version } : {}),
		...(description ? { description } : {}),
	};
}

/**
 * Search the npm registry by name or keyword.
 *
 * The npm search endpoint requires at least two characters. Shorter queries
 * return an empty list rather than throwing; the picker resolves those with
 * {@link getPackument} instead.
 */
export async function searchPackages(
	term: string,
	size = 10,
): Promise<RegistrySearchResult[]> {
	const text = term.trim().slice(0, MAX_SEARCH_TERM_LENGTH);

	if (text.length < 2) {
		return [];
	}

	const limit = Number.isFinite(size)
		? Math.min(Math.max(Math.trunc(size), 1), MAX_SEARCH_SIZE)
		: 10;

	let response: unknown;

	try {
		response = await registry<unknown>("/-/v1/search", {
			query: { text, size: limit },
		});
	} catch (error) {
		throw toRegistryError(error, `Searching npm for "${text}"`);
	}

	if (!isRecord(response)) {
		throw new RegistryError(
			"invalid-response",
			"npm returned an unexpected search response.",
		);
	}

	const objects = Array.isArray(response.objects) ? response.objects : [];
	const seen = new Set<string>();
	const results: RegistrySearchResult[] = [];

	for (const object of objects) {
		const result = toSearchResult(object);

		if (!result || seen.has(result.name)) {
			continue;
		}

		seen.add(result.name);
		results.push(result);
	}

	return results;
}

/** Load and normalize the full packument for one package. */
export async function getPackument(name: string): Promise<RegistryPackument> {
	const trimmed = name.trim();

	if (!trimmed) {
		throw new RegistryError(
			"invalid-response",
			"A package name is required.",
		);
	}

	let response: unknown;

	try {
		response = await registry<unknown>(`/${encodeURIComponent(trimmed)}`);
	} catch (error) {
		throw toRegistryError(error, `Loading "${trimmed}" from npm`);
	}

	const packument = normalizePackument(trimmed, response);

	if (!packument) {
		throw new RegistryError(
			"invalid-response",
			`npm returned an unexpected packument for "${trimmed}".`,
		);
	}

	return packument;
}
