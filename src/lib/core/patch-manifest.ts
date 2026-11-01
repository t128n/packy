/**
 * Lifecycle and publish/test hooks neutralized before packing. Keep this list
 * in sync with the spec: every hook becomes a no-op in the archived manifest.
 */
export const LIFECYCLE_HOOKS = [
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
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dependencyNames(value: unknown): string[] {
	if (!isRecord(value)) {
		return [];
	}

	return Object.keys(value);
}

function optionalPeerNames(manifest: Record<string, unknown>): Set<string> {
	const meta = manifest.peerDependenciesMeta;

	if (!isRecord(meta)) {
		return new Set();
	}

	return new Set(
		Object.entries(meta)
			.filter(([, value]) => isRecord(value) && value.optional === true)
			.map(([name]) => name),
	);
}

/**
 * Peer dependencies that are required by the package. Optional peers stay
 * optional and are not bundled.
 */
export function requiredPeerDependencies(
	manifest: Record<string, unknown>,
): Record<string, string> {
	const optional = optionalPeerNames(manifest);
	const peers = manifest.peerDependencies;

	if (!isRecord(peers)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(peers).filter(
			(entry): entry is [string, string] =>
				typeof entry[1] === "string" && !optional.has(entry[0]),
		),
	);
}

/**
 * Apply the spec's patch rules to an installed package manifest.
 *
 * The result is a new object: the input manifest is never mutated.
 */
export function patchInstalledManifest(
	manifest: Record<string, unknown>,
): Record<string, unknown> {
	const bundled = [
		...new Set([
			...dependencyNames(manifest.dependencies),
			...dependencyNames(manifest.optionalDependencies),
			...Object.keys(requiredPeerDependencies(manifest)),
		]),
	].toSorted();

	const patched: Record<string, unknown> = {
		...manifest,
		bundleDependencies: bundled,
		bundledDependencies: bundled,
	};

	if (isRecord(manifest.scripts)) {
		const patchedScripts: Record<string, unknown> = { ...manifest.scripts };

		for (const hook of LIFECYCLE_HOOKS) {
			if (Object.hasOwn(patchedScripts, hook)) {
				patchedScripts[hook] = `echo skip-${hook}`;
			}
		}

		patched.scripts = patchedScripts;
	}

	return patched;
}
