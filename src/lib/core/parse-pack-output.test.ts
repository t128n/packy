import { describe, expect, test } from "bun:test";

import { findTarball, parsePackOutput } from "./parse-pack-output";

const packEntry = {
	id: "lodash@4.17.21",
	name: "lodash",
	version: "4.17.21",
	size: 1234,
	filename: "lodash-4.17.21.tgz",
};

describe("parsePackOutput", () => {
	test("parses a plain JSON array", () => {
		expect(parsePackOutput(JSON.stringify([packEntry]))).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("parses output with notices before the array", () => {
		const output = `npm notice\nnpm notice Publishing to the registry\n${JSON.stringify([packEntry])}`;

		expect(parsePackOutput(output)).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("parses output with notices after the array", () => {
		const output = `${JSON.stringify([packEntry])}\nnpm notice [done]\nnpm notice complete`;

		expect(parsePackOutput(output)).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("parses output with notices on both sides", () => {
		const output = `npm notice starting "quoted text\n${JSON.stringify([packEntry])}\nnpm notice finished`;

		expect(parsePackOutput(output)).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("parses a scoped package filename exactly as npm reports it", () => {
		const scoped = {
			id: "@scope/name@1.0.0",
			name: "@scope/name",
			version: "1.0.0",
			filename: "scope-name-1.0.0.tgz",
		};

		expect(parsePackOutput(JSON.stringify([scoped]))).toEqual({
			filename: "scope-name-1.0.0.tgz",
			name: "@scope/name",
			version: "1.0.0",
		});
	});

	test("returns the last complete pack array", () => {
		const first = {
			id: "first@1.0.0",
			name: "first",
			version: "1.0.0",
			filename: "first-1.0.0.tgz",
		};
		const second = {
			id: "second@2.0.0",
			name: "second",
			version: "2.0.0",
			filename: "second-2.0.0.tgz",
		};
		const output = `${JSON.stringify([first])}\n${JSON.stringify([second])}`;

		expect(parsePackOutput(output)).toEqual({
			filename: "second-2.0.0.tgz",
			name: "second",
			version: "2.0.0",
		});
	});

	test("skips later arrays that are not pack output", () => {
		const output = `${JSON.stringify([packEntry])}\n[1, 2, 3]`;

		expect(parsePackOutput(output)).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("handles brackets inside JSON strings", () => {
		const unusual = {
			...packEntry,
			filename: "weird-[name]-4.17.21.tgz",
		};

		expect(parsePackOutput(JSON.stringify([unusual]))).toEqual({
			filename: "weird-[name]-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("parses output wrapped in ANSI escapes", () => {
		const output = `\u001B[32m${JSON.stringify([packEntry])}\u001B[0m`;

		expect(parsePackOutput(output)).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});

	test("returns null for arbitrary text", () => {
		expect(parsePackOutput("npm error something failed")).toBeNull();
		expect(parsePackOutput("")).toBeNull();
		expect(parsePackOutput("{}")).toBeNull();
		expect(parsePackOutput("[not json]")).toBeNull();
	});

	test("returns null when the array lacks pack fields", () => {
		expect(
			parsePackOutput(JSON.stringify([{ name: "lodash" }])),
		).toBeNull();
		expect(
			parsePackOutput(
				JSON.stringify([
					{ name: "", version: "1.0.0", filename: "x.tgz" },
				]),
			),
		).toBeNull();
	});

	test("ignores an unclosed trailing array", () => {
		const output = `${JSON.stringify([packEntry])}\nnpm notice [still running`;

		expect(parsePackOutput(output)).toEqual({
			filename: "lodash-4.17.21.tgz",
			name: "lodash",
			version: "4.17.21",
		});
	});
});

describe("findTarball", () => {
	test("returns the filename when exactly one tarball exists", () => {
		expect(findTarball(["package.tgz"])).toBe("package.tgz");
		expect(findTarball(["README.md", "package.tgz", "index.js"])).toBe(
			"package.tgz",
		);
	});

	test("returns null without exactly one tarball", () => {
		expect(findTarball([])).toBeNull();
		expect(findTarball(["README.md", "index.js"])).toBeNull();
		expect(findTarball(["a.tgz", "b.tgz"])).toBeNull();
	});

	test("does not mutate the file list", () => {
		const files = ["b.tgz", "a.txt"];

		expect(findTarball(files)).toBe("b.tgz");
		expect(files).toEqual(["b.tgz", "a.txt"]);
	});
});
