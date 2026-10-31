import { describe, expect, test } from "bun:test";

import { LIFECYCLE_HOOKS, patchInstalledManifest } from "./patch-manifest";

function freezeDeep<T>(value: T): T {
	if (typeof value !== "object" || value === null) {
		return value;
	}

	for (const nested of Object.values(value)) {
		freezeDeep(nested);
	}

	return Object.freeze(value);
}

describe("LIFECYCLE_HOOKS", () => {
	test("contains exactly the thirteen spec hooks", () => {
		expect(LIFECYCLE_HOOKS).toEqual([
			"preinstall",
			"install",
			"postinstall",
			"prepare",
			"prepack",
			"postpack",
			"prepublish",
			"prepublishOnly",
			"publish",
			"postpublish",
			"pretest",
			"test",
			"posttest",
		]);
		expect(LIFECYCLE_HOOKS).toHaveLength(13);
	});
});

describe("patchInstalledManifest", () => {
	test("sets both bundle fields to the sorted de-duplicated union", () => {
		const patched = patchInstalledManifest({
			dependencies: { zebra: "^1.0.0", alpha: "^2.0.0" },
			optionalDependencies: { alpha: "^2.0.0", beta: "^3.0.0" },
		});

		expect(patched.bundleDependencies).toEqual(["alpha", "beta", "zebra"]);
		expect(patched.bundledDependencies).toEqual(["alpha", "beta", "zebra"]);
	});

	test("replaces bundleDependencies: true with the explicit array", () => {
		const patched = patchInstalledManifest({
			bundleDependencies: true,
			bundledDependencies: ["stale"],
			dependencies: { beta: "1.0.0", alpha: "1.0.0" },
		});

		expect(patched.bundleDependencies).toEqual(["alpha", "beta"]);
		expect(patched.bundledDependencies).toEqual(["alpha", "beta"]);
	});

	test("writes empty arrays when there are no dependencies", () => {
		const patched = patchInstalledManifest({
			name: "pkg",
			bundleDependencies: true,
		});

		expect(patched.bundleDependencies).toEqual([]);
		expect(patched.bundledDependencies).toEqual([]);
	});

	test("does not bundle peer dependencies", () => {
		const patched = patchInstalledManifest({
			dependencies: { runtime: "1.0.0" },
			optionalDependencies: { optional: "1.0.0" },
			peerDependencies: { peer: "1.0.0" },
		});

		expect(patched.bundleDependencies).toEqual(["optional", "runtime"]);
	});

	test("neutralizes every hook and preserves unrelated scripts", () => {
		const hooks = [...LIFECYCLE_HOOKS];
		const scripts: Record<string, string> = { build: "tsc" };

		for (const hook of hooks) {
			scripts[hook] = `node scripts/${hook}.js`;
		}

		const patched = patchInstalledManifest({ scripts });
		const patchedScripts = patched.scripts as Record<string, string>;

		for (const hook of hooks) {
			expect(patchedScripts[hook]).toBe(`echo skip-${hook}`);
		}

		expect(patchedScripts.build).toBe("tsc");
	});

	test("only neutralizes hooks that are present", () => {
		const patched = patchInstalledManifest({
			scripts: { postinstall: "node postinstall.js" },
		});

		expect(patched.scripts).toEqual({
			postinstall: "echo skip-postinstall",
		});
	});

	test("preserves unrelated manifest fields", () => {
		const patched = patchInstalledManifest({
			name: "pkg",
			version: "1.2.3",
			description: "fixture",
			private: false,
			main: "index.js",
			files: ["dist"],
			bin: { pkg: "cli.js" },
			dependencies: { dep: "^1.0.0" },
			peerDependencies: { peer: "^2.0.0" },
			scripts: { build: "tsc", test: "node test.js" },
		});

		expect(patched).toMatchObject({
			name: "pkg",
			version: "1.2.3",
			description: "fixture",
			private: false,
			main: "index.js",
			files: ["dist"],
			bin: { pkg: "cli.js" },
			dependencies: { dep: "^1.0.0" },
			peerDependencies: { peer: "^2.0.0" },
			scripts: { build: "tsc", test: "echo skip-test" },
		});
	});

	test("does not mutate the input manifest", () => {
		const manifest = freezeDeep({
			name: "pkg",
			bundleDependencies: true,
			dependencies: { zebra: "1.0.0", alpha: "1.0.0" },
			scripts: { postinstall: "node postinstall.js", build: "tsc" },
		});
		const snapshot = structuredClone(manifest) as Record<string, unknown>;

		const patched = patchInstalledManifest(manifest);

		expect(manifest as Record<string, unknown>).toEqual(snapshot);
		expect(patched).not.toBe(manifest);
		expect(patched.scripts).not.toBe(manifest.scripts);
		expect(manifest.bundleDependencies).toBe(true);
		expect((manifest.scripts as Record<string, string>).postinstall).toBe(
			"node postinstall.js",
		);
	});

	test("ignores non-object dependency fields", () => {
		const patched = patchInstalledManifest({
			dependencies: null,
			optionalDependencies: ["not", "a", "record"],
		});

		expect(patched.bundleDependencies).toEqual([]);
		expect(patched.bundledDependencies).toEqual([]);
	});

	test("leaves a manifest without scripts unchanged apart from bundles", () => {
		const patched = patchInstalledManifest({ name: "pkg" });

		expect(patched).toEqual({
			name: "pkg",
			bundleDependencies: [],
			bundledDependencies: [],
		});
		expect(patched).not.toHaveProperty("scripts");
	});
});
