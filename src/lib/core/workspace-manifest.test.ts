import { describe, expect, test } from "bun:test";

import { createWorkspaceManifest } from "./workspace-manifest";

describe("createWorkspaceManifest", () => {
	test("matches the spec shape", () => {
		expect(
			createWorkspaceManifest({
				name: "lodash",
				versionSpec: "^4.17.21",
			}),
		).toEqual({
			name: "packy-repack",
			version: "0.0.0",
			private: true,
			dependencies: { lodash: "^4.17.21" },
		});
	});

	test("contains exactly one dependency", () => {
		const manifest = createWorkspaceManifest({
			name: "@types/node",
			versionSpec: "latest",
		});

		expect(Object.keys(manifest.dependencies)).toEqual(["@types/node"]);
		expect(manifest.dependencies["@types/node"]).toBe("latest");
	});

	test("keeps the scoped name as the dependency key", () => {
		expect(
			createWorkspaceManifest({
				name: "@scope/name",
				versionSpec: "1.2.3",
			}),
		).toEqual({
			name: "packy-repack",
			version: "0.0.0",
			private: true,
			dependencies: { "@scope/name": "1.2.3" },
		});
	});

	test("does not mutate the reference", () => {
		const reference = Object.freeze({
			name: "lodash",
			versionSpec: "4.17.21",
		});
		const manifest = createWorkspaceManifest(reference);

		expect(reference).toEqual({ name: "lodash", versionSpec: "4.17.21" });
		expect(manifest.dependencies).not.toBe(reference);
	});

	test("returns an independent dependencies object per call", () => {
		const first = createWorkspaceManifest({
			name: "lodash",
			versionSpec: "4.17.21",
		});
		const second = createWorkspaceManifest({
			name: "svelte",
			versionSpec: "latest",
		});

		expect(first.dependencies).not.toBe(second.dependencies);
		expect(first.dependencies).toEqual({ lodash: "4.17.21" });
		expect(second.dependencies).toEqual({ svelte: "latest" });
	});
});
