import { describe, expect, test } from "bun:test";

import { RunError } from "./errors";
import {
	normalizePackageName,
	normalizePackageReference,
} from "./normalize-input";

describe("normalizePackageReference", () => {
	test("accepts an exact unscoped version", () => {
		expect(
			normalizePackageReference({ name: "lodash", version: "4.17.21" }),
		).toEqual({ name: "lodash", versionSpec: "4.17.21" });
	});

	test("accepts a scoped name and a semver range", () => {
		expect(
			normalizePackageReference({
				name: "@types/node",
				version: "^20.0.0",
			}),
		).toEqual({ name: "@types/node", versionSpec: "^20.0.0" });
	});

	test("accepts a dist-tag", () => {
		expect(
			normalizePackageReference({ name: "svelte", version: "next" }),
		).toEqual({ name: "svelte", versionSpec: "next" });
	});

	test("keeps range syntax, including spaces", () => {
		expect(
			normalizePackageReference({
				name: "lodash",
				version: " >=1.0.0 <2.0.0 ",
			}),
		).toEqual({ name: "lodash", versionSpec: ">=1.0.0 <2.0.0" });
	});

	test("defaults a missing version to latest", () => {
		expect(normalizePackageReference({ name: "lodash" })).toEqual({
			name: "lodash",
			versionSpec: "latest",
		});
	});

	test("defaults an empty or whitespace-only version to latest", () => {
		expect(
			normalizePackageReference({ name: "lodash", version: "" }),
		).toEqual({ name: "lodash", versionSpec: "latest" });
		expect(
			normalizePackageReference({ name: "lodash", version: "   " }),
		).toEqual({ name: "lodash", versionSpec: "latest" });
	});

	test("trims the name and version spec", () => {
		expect(
			normalizePackageReference({
				name: "  lodash  ",
				version: "  ^4.17.0  ",
			}),
		).toEqual({ name: "lodash", versionSpec: "^4.17.0" });
	});

	test("does not mutate the input reference", () => {
		const input = Object.freeze({
			name: "  lodash  ",
			version: "  ^4.17.0  ",
		});
		const result = normalizePackageReference(input);

		expect(input).toEqual({ name: "  lodash  ", version: "  ^4.17.0  " });
		expect(result).not.toBe(input);
	});

	test("rejects an empty name", () => {
		expect(() => normalizePackageReference({ name: "" })).toThrow(RunError);
		expect(() => normalizePackageReference({ name: "   " })).toThrow(
			"A package name is required.",
		);
	});

	test("rejects invalid names", () => {
		const invalidNames = [
			"Lodash",
			"@Scope/name",
			"@scope/Name",
			".hidden",
			"@scope/.hidden",
			"_private",
			"@scope/_private",
			"foo bar",
			"@scope",
			"foo/bar",
			"foo@1.0.0",
			"@scope/name/extra",
			"foo+bar",
		];

		for (const name of invalidNames) {
			expect(() => normalizePackageReference({ name })).toThrow(RunError);
		}
	});

	test("rejects protocol specs in the name", () => {
		const specs = [
			"file:../package",
			"link:../package",
			"workspace:*",
			"git+https://github.com/t128n/packy",
			"git:github.com/t128n/packy",
			"http://example.com/package.tgz",
			"https://example.com/package.tgz",
			"npm:lodash@4",
			"github:t128n/packy",
		];

		for (const name of specs) {
			expect(() => normalizePackageReference({ name })).toThrow(RunError);
		}
	});

	test("rejects protocol specs in the version", () => {
		const specs = [
			"file:../package",
			"link:../package",
			"workspace:*",
			"git+https://github.com/t128n/packy",
			"https://example.com/package.tgz",
			"npm:lodash@4",
		];

		for (const version of specs) {
			expect(() =>
				normalizePackageReference({ name: "lodash", version }),
			).toThrow(RunError);
		}
	});

	test("rejects local path specs in the version", () => {
		const specs = [
			"../package",
			"./package",
			"/absolute/package",
			"~/package",
			"..",
			".",
			"..\\package",
		];

		for (const version of specs) {
			expect(() =>
				normalizePackageReference({ name: "lodash", version }),
			).toThrow(RunError);
		}
	});

	test("accepts tilde semver ranges", () => {
		expect(
			normalizePackageReference({ name: "lodash", version: "~4.17.0" }),
		).toEqual({ name: "lodash", versionSpec: "~4.17.0" });
	});

	test("reports invalid input as a prepare failure", () => {
		try {
			normalizePackageReference({ name: "" });
			throw new Error("expected normalization to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(RunError);
			expect((error as RunError).stage).toBe("prepare");
		}
	});
});

describe("normalizePackageName", () => {
	test("trims and accepts unscoped and scoped names", () => {
		expect(normalizePackageName("  lodash  ")).toBe("lodash");
		expect(normalizePackageName("@scope/my_pkg.js")).toBe(
			"@scope/my_pkg.js",
		);
		expect(normalizePackageName("my-pkg_2.0")).toBe("my-pkg_2.0");
	});

	test("rejects empty and invalid names", () => {
		expect(() => normalizePackageName("")).toThrow(RunError);
		expect(() => normalizePackageName("../../etc/passwd")).toThrow(
			RunError,
		);
		expect(() => normalizePackageName("@scope/")).toThrow(RunError);
	});
});
