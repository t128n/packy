export type BundleMethod = "slim-bundle" | "full-bundle";

export type PackageRef = {
	name: string;
	version: string;
};

export type PackageVersion = {
	value: string;
	label: string;
	latest?: boolean;
	deprecated?: string;
	sizeBytes?: number;
};

export type SelectedPackage = PackageRef & {
	versions: PackageVersion[];
	description?: string;
	sizeBytes?: number;
};

export type BundleMeta = {
	name: string;
	version: string;
	method: BundleMethod;
};

export type BundleResult = {
	name: string;
	version: string;
	filename: string;
	url: string;
	output: string;
	size: number;
};

export type SelectAdvancePayload = {
	packages: PackageRef[];
	bundleName: string;
	bundleVersion: string;
	bundleMethod: BundleMethod;
};

export function formatBytes(bytes?: number) {
	if (bytes === undefined) {
		return "—";
	}

	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unit = 0;

	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}

	return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
