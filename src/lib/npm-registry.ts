import { ofetch } from "ofetch";

export type RegistryVersion = {
	version: string;
	deprecated?: string;
	dist?: {
		unpackedSize?: number;
	};
};

export type RegistryPackument = {
	name: string;
	description?: string;
	"dist-tags"?: Record<string, string>;
	versions?: Record<string, RegistryVersion>;
};

const registry = ofetch.create({
	baseURL: "https://registry.npmjs.org",
});

export async function searchPackages(
	term: string,
	size = 10,
): Promise<RegistryPackument[]> {
	const response = await registry<{
		objects?: Array<{
			package?: { name?: string; version?: string; description?: string };
		}>;
	}>("/-/v1/search", {
		query: {
			text: term,
			size,
		},
	});

	const names = [
		...new Set(
			(response.objects ?? [])
				.map((result) => result.package?.name)
				.filter((name): name is string => Boolean(name)),
		),
	];

	const packuments = await Promise.all(
		names.map(async (name) => {
			return registry<RegistryPackument>(`/${encodeURIComponent(name)}`);
		}),
	);

	return packuments;
}

export async function getPackument(name: string) {
	return registry<RegistryPackument>(`/${encodeURIComponent(name)}`);
}
