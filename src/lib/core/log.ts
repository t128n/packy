/** Maximum number of UTF-8 bytes retained in a run log. */
export const MAX_LOG_BYTES = 200 * 1024;

const TRUNCATION_MARKER = "[truncated]";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// OSC sequences: ESC ] ... BEL or ESC \.
// oxlint-disable-next-line no-control-regex -- ANSI escapes are control bytes.
const OSC_PATTERN = /\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g;

// CSI sequences: ESC [ parameters/intermediates final.
// oxlint-disable-next-line no-control-regex -- ANSI escapes are control bytes.
const CSI_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/g;

// Other single-character escapes and the 8-bit CSI introducer.
// oxlint-disable-next-line no-control-regex -- ANSI escapes are control bytes.
const OTHER_ESCAPE_PATTERN = /\u001B[@-_]|\u009B[0-?]*[ -/]*[@-~]/g;

// Non-global copies used to check whether a fragment is a complete escape.
// oxlint-disable-next-line no-control-regex -- ANSI escapes are control bytes.
const OSC_SEQUENCE_PATTERN = /\u001B\][\s\S]*?(?:\u0007|\u001B\\)/;
// oxlint-disable-next-line no-control-regex -- ANSI escapes are control bytes.
const CSI_SEQUENCE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/;

/** Remove ANSI CSI and OSC escape sequences from a string. */
export function stripAnsi(input: string): string {
	return input
		.replace(OSC_PATTERN, "")
		.replace(CSI_PATTERN, "")
		.replace(OTHER_ESCAPE_PATTERN, "");
}

type LogBuffer = {
	append(chunk: string): void;
	text(): string;
};

function isCompleteEscape(value: string): boolean {
	if (value.length < 2) {
		return false;
	}

	const kind = value[1];

	if (kind === "[") {
		return CSI_SEQUENCE_PATTERN.test(value);
	}

	if (kind === "]") {
		return OSC_SEQUENCE_PATTERN.test(value);
	}

	if (kind === "(" || kind === ")" || kind === "#" || kind === "%") {
		return value.length >= 3;
	}

	return true;
}

/**
 * Collect run output as a bounded log.
 *
 * ANSI escapes are removed, CRLF and lone CR become `\n`, and the retained
 * text is capped at `MAX_LOG_BYTES` UTF-8 bytes. When the cap is crossed, the
 * oldest content is dropped and a `[truncated]` marker is prefixed.
 */
export function createLogBuffer(): LogBuffer {
	let buffer = "";
	let retainedBytes = 0;
	let pendingCarriageReturn = false;
	let pendingEscape = "";
	let truncated = false;

	const tailBudget = MAX_LOG_BYTES;

	function trimTail(): void {
		const bytes = encoder.encode(buffer);

		if (bytes.length <= tailBudget) {
			retainedBytes = bytes.length;
			return;
		}

		let start = bytes.length - tailBudget;

		// Never start inside a multi-byte UTF-8 sequence.
		while (
			start < bytes.length &&
			(bytes[start]! & 0b1100_0000) === 0b1000_0000
		) {
			start += 1;
		}

		buffer = decoder.decode(bytes.subarray(start));
		retainedBytes = bytes.length - start;
	}

	function push(value: string): void {
		if (value.length === 0) {
			return;
		}

		buffer += value;
		retainedBytes += encoder.encode(value).length;

		if (!truncated && retainedBytes > MAX_LOG_BYTES) {
			truncated = true;
		}

		if (truncated && retainedBytes > tailBudget) {
			trimTail();
		}
	}

	function append(chunk: string): void {
		const combined = pendingEscape + chunk;
		pendingEscape = "";

		const escapeIndex = combined.lastIndexOf("\u001B");
		let input = combined;

		if (escapeIndex !== -1) {
			const suffix = combined.slice(escapeIndex);

			if (!isCompleteEscape(suffix)) {
				pendingEscape = suffix;
				input = combined.slice(0, escapeIndex);
			}
		}

		const clean = stripAnsi(input);
		let normalized = pendingCarriageReturn ? `\r${clean}` : clean;

		pendingCarriageReturn = normalized.endsWith("\r");

		if (pendingCarriageReturn) {
			normalized = normalized.slice(0, -1);
		}

		push(normalized.replace(/\r\n?/g, "\n"));
	}

	function text(): string {
		// A trailing CR may have been a CRLF split across chunks.
		if (pendingCarriageReturn) {
			pendingCarriageReturn = false;
			push("\n");
		}

		return truncated ? `${TRUNCATION_MARKER}${buffer}` : buffer;
	}

	return { append, text };
}
