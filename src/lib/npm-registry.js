import { ofetch } from "ofetch";
const registry = ofetch.create({
    baseURL: "https://registry.npmjs.org",
});
export async function searchPackages(term, size = 10) {
    const response = await registry("/-/v1/search", {
        query: {
            text: term,
            size,
        },
    });
    const names = [
        ...new Set((response.objects ?? [])
            .map((result) => result.package?.name)
            .filter((name) => Boolean(name))),
    ];
    const packuments = await Promise.all(names.map(async (name) => {
        return registry(`/${encodeURIComponent(name)}`);
    }));
    return packuments;
}
export async function getPackument(name) {
    return registry(`/${encodeURIComponent(name)}`);
}
