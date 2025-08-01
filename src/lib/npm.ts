import { rcompare } from "semver";

export type NpmPkg = {
	name: string;
	version: string;
	description?: string;
};

export type NpmVersion = {
	version: string;
	created?: string;
	tags?: string[]; // e.g., ["latest", "next"]
};

const BASE = "https://registry.npmjs.org";

type NpmSearchResult = {
	package: {
		name: string;
		version: string;
		description?: string;
	};
};
export async function searchNpm(query: string, size = 10): Promise<NpmPkg[]> {
	if (!query.trim()) return [];
	const url = `${BASE}/-/v1/search?text=${encodeURIComponent(
		query,
	)}&size=${size}`;
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) return [];
	const data = await res.json();

	return (data.objects ?? []).map((o: NpmSearchResult) => ({
		name: o.package.name,
		version: o.package.version,
		description: o.package.description,
	}));
}

// Fetch versions, annotate which are tags (latest, beta, etc.)
export async function getPackageVersions(
	pkgName: string,
): Promise<NpmVersion[]> {
	if (!pkgName) return [];
	const url = `${BASE}/${encodeURIComponent(pkgName)}`;
	const res = await fetch(url, { cache: "no-store" });
	if (!res.ok) return [];
	const data = await res.json();

	const versions: string[] = Object.keys(data.versions ?? {});
	const time = data.time ?? {};
	const distTags: Record<string, string> = data["dist-tags"] ?? {};

	// Invert dist-tags to collect which tags point to a version
	const tagMap: Record<string, string[]> = {};
	for (const [tag, v] of Object.entries(distTags)) {
		if (!tagMap[v]) tagMap[v] = [];
		tagMap[v].push(tag);
	}

	return versions
		.map((v) => ({
			version: v,
			created: time[v],
			tags: tagMap[v] ?? [],
		}))
		.sort((a, b) => {
			const cmp = rcompare(a.version, b.version);
			if (cmp !== 0) return cmp;

			const ta = a.created ? Date.parse(a.created) : 0;
			const tb = b.created ? Date.parse(b.created) : 0;
			return tb - ta;
		});
}

function stripAnsi(s: string): string {
	return s
		.replace(
			// biome-ignore lint/suspicious/noControlCharactersInRegex: Needed to remove ANSI codes
			/\u001B\[[0-9;]*[A-Za-z]/g,
			"",
		)
		.replace(/\r/g, "");
}

export function parseTarballName(stdout: string): string | null {
	const out = stripAnsi(stdout);

	// Primary: npm notice filename: <name>.tgz
	const m = out.match(/npm notice filename:\s*([^\s]+\.tgz)/i);
	if (m?.[1]) return m[1];

	// Secondary: any token ending with .tgz on its own line
	const m2 = out.match(/^\s*([^\s]+\.tgz)\s*$/im);
	if (m2?.[1]) return m2[1];

	// Tertiary: last .tgz-ish token anywhere
	const all = [...out.matchAll(/([^\s]+\.tgz)/gi)].map((x) => x[1]);
	if (all.length > 0) return all[all.length - 1];

	return null;
}
