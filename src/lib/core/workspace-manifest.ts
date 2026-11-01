import type { PackageReference } from "./types";

/** The workspace package.json is only a vehicle for installing the selection. */
type WorkspaceManifest = {
	name: "packy-repack";
	version: "0.0.0";
	private: true;
	dependencies: Record<string, string>;
};

/**
 * Generate the workspace manifest described by the spec.
 *
 * The manifest contains exactly one dependency: the selected package.
 */
export function createWorkspaceManifest(
	reference: PackageReference,
): WorkspaceManifest {
	return {
		name: "packy-repack",
		version: "0.0.0",
		private: true,
		dependencies: {
			[reference.name]: reference.versionSpec,
		},
	};
}
