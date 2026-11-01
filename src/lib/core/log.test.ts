import { describe, expect, test } from "bun:test";

import { createLogBuffer, MAX_LOG_BYTES, stripAnsi } from "./log";

const encoder = new TextEncoder();
const marker = "[truncated]";
const tailBudget = MAX_LOG_BYTES;

function utf8Length(value: string): number {
	return encoder.encode(value).length;
}

describe("MAX_LOG_BYTES", () => {
	test("is 200 KiB", () => {
		expect(MAX_LOG_BYTES).toBe(200 * 1024);
	});
});

describe("stripAnsi", () => {
	test("removes CSI color sequences", () => {
		expect(stripAnsi("\x1b[1;31mred\x1b[0m text")).toBe("red text");
		expect(stripAnsi("\x1b[38;5;196mred\x1b[0m")).toBe("red");
	});

	test("removes CSI cursor sequences", () => {
		expect(stripAnsi("\x1b[2K\x1b[1Gdone")).toBe("done");
	});

	test("removes OSC sequences terminated by BEL", () => {
		expect(stripAnsi("\x1b]0;npm title\x07hello")).toBe("hello");
	});

	test("removes OSC sequences terminated by ST", () => {
		expect(
			stripAnsi("\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\"),
		).toBe("link");
	});

	test("leaves plain text untouched", () => {
		expect(stripAnsi("npm notice installed 123 packages\n")).toBe(
			"npm notice installed 123 packages\n",
		);
	});
});

describe("createLogBuffer", () => {
	test("normalizes CRLF and lone CR", () => {
		const buffer = createLogBuffer();
		buffer.append("one\r\ntwo\rthree\n");

		expect(buffer.text()).toBe("one\ntwo\nthree\n");
	});

	test("normalizes a CRLF split across chunks", () => {
		const buffer = createLogBuffer();
		buffer.append("a\r");
		buffer.append("\nb");

		expect(buffer.text()).toBe("a\nb");
	});

	test("flushes a trailing carriage return when read", () => {
		const buffer = createLogBuffer();
		buffer.append("tail\r");

		expect(buffer.text()).toBe("tail\n");
		expect(buffer.text()).toBe("tail\n");
	});

	test("strips ANSI sequences", () => {
		const buffer = createLogBuffer();
		buffer.append("\x1b[32mok\x1b[0m\n");

		expect(buffer.text()).toBe("ok\n");
	});

	test("strips an ANSI sequence split across chunks", () => {
		const buffer = createLogBuffer();
		buffer.append("before \x1b[3");
		buffer.append("1mred\x1b[0m after");

		expect(buffer.text()).toBe("before red after");
	});

	test("strips an OSC sequence split across chunks", () => {
		const buffer = createLogBuffer();
		buffer.append("\x1b]0;title");
		buffer.append("\x07text");

		expect(buffer.text()).toBe("text");
	});

	test("keeps a log at the cap unchanged", () => {
		const buffer = createLogBuffer();
		buffer.append("y".repeat(MAX_LOG_BYTES));

		expect(buffer.text()).toBe("y".repeat(MAX_LOG_BYTES));
		expect(buffer.text()).not.toContain(marker);
	});

	test("keeps the tail and prefixes a marker when a single chunk overflows", () => {
		const buffer = createLogBuffer();
		buffer.append("x".repeat(MAX_LOG_BYTES + 100));

		const result = buffer.text();
		const body = result.slice(marker.length);

		expect(result.startsWith(marker)).toBe(true);
		expect(body).toBe("x".repeat(tailBudget));
		expect(utf8Length(result)).toBeLessThanOrEqual(
			MAX_LOG_BYTES + marker.length,
		);
	});

	test("keeps the tail across many chunks", () => {
		const buffer = createLogBuffer();
		const chunk = "0123456789".repeat(1000);

		for (let index = 0; index < 25; index += 1) {
			buffer.append(chunk);
		}

		const result = buffer.text();
		const body = result.slice(marker.length);

		expect(result.startsWith(marker)).toBe(true);
		expect(utf8Length(body)).toBeLessThanOrEqual(tailBudget);
		expect(utf8Length(result)).toBeLessThanOrEqual(
			MAX_LOG_BYTES + marker.length,
		);
		expect(body.endsWith(chunk)).toBe(true);
	});

	test("never splits a multi-byte character at the cap", () => {
		const buffer = createLogBuffer();
		buffer.append("a" + "€".repeat(MAX_LOG_BYTES));

		const result = buffer.text();
		const body = result.slice(marker.length);

		expect(result.startsWith(marker)).toBe(true);
		expect(utf8Length(body)).toBeLessThanOrEqual(tailBudget);
		expect(utf8Length(result)).toBeLessThanOrEqual(
			MAX_LOG_BYTES + marker.length,
		);
		expect(body).not.toContain("\uFFFD");
		expect(body.endsWith("€")).toBe(true);
	});

	test("returns the same text on repeated reads", () => {
		const buffer = createLogBuffer();
		buffer.append("stable\n");

		expect(buffer.text()).toBe(buffer.text());
	});
});
