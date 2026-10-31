import { stripAnsi } from "./log";

type PackOutput = {
	filename: string;
	name: string;
	version: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.length > 0;
}

/**
 * Collect JSON arrays from free-form npm output. Strings inside arrays are
 * respected, so brackets in notice text or JSON strings do not split a
 * candidate.
 */
function findJsonArrays(input: string): unknown[] {
	const arrays: unknown[] = [];
	const starts: number[] = [];
	let escaped = false;
	let inString = false;

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];

		if (inString) {
			if (escaped) {
				escaped = false;
			} else if (character === "\\") {
				escaped = true;
			} else if (character === '"') {
				inString = false;
			} else if (character === "\n") {
				// Raw newlines cannot appear inside JSON strings. Resynchronize
				// after an unmatched quote in surrounding notice text.
				inString = false;
				escaped = false;
			}
			continue;
		}

		if (character === '"' && starts.length > 0) {
			inString = true;
		} else if (character === "[") {
			starts.push(index);
		} else if (character === "]" && starts.length > 0) {
			const start = starts.pop();

			if (start === undefined) {
				continue;
			}

			try {
				arrays.push(JSON.parse(input.slice(start, index + 1)));
			} catch {
				// Not a complete JSON array; keep scanning.
			}
		}
	}

	return arrays;
}

function toPackOutput(value: unknown): PackOutput | null {
	if (!Array.isArray(value)) {
		return null;
	}

	for (let index = value.length - 1; index >= 0; index -= 1) {
		const entry: unknown = value[index];

		if (!isRecord(entry)) {
			continue;
		}

		const { filename, name, version } = entry;

		if (
			isNonEmptyString(filename) &&
			isNonEmptyString(name) &&
			isNonEmptyString(version)
		) {
			return { filename, name, version };
		}
	}

	return null;
}

/**
 * Extract the archive filename and identity from `npm pack --json` output.
 *
 * npm may interleave notices before or after the JSON array, so the last
 * complete array that looks like pack output wins. Arbitrary text yields
 * `null`.
 */
export function parsePackOutput(output: string): PackOutput | null {
	const arrays = findJsonArrays(stripAnsi(output));

	for (let index = arrays.length - 1; index >= 0; index -= 1) {
		const parsed = toPackOutput(arrays[index]);

		if (parsed !== null) {
			return parsed;
		}
	}

	return null;
}

/**
 * Directory-listing fallback: use the tarball only when exactly one exists.
 */
export function findTarball(files: string[]): string | null {
	const tarballs = files.filter((file) => file.endsWith(".tgz"));

	return tarballs.length === 1 ? (tarballs[0] ?? null) : null;
}
