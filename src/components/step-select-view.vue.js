/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/template-helpers.d.ts" />
/// <reference types="../../../../../.npm/_npx/2db181330ea4b15b/node_modules/@vue/language-core/types/props-fallback.d.ts" />
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, resolveComponent, watch, } from "vue";
import { getPackument, searchPackages as searchRegistryPackages, } from "~/lib/npm-registry";
const emit = defineEmits();
const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UIcon = resolveComponent("UIcon");
const USelectMenu = resolveComponent("USelectMenu");
const UTable = resolveComponent("UTable");
const selectedPackages = ref([]);
const pendingPackage = ref("");
const selectedVersions = ref({});
const searchTerm = ref("");
const searchLoading = ref(false);
const searchError = ref("");
const showNoResults = ref(false);
const bundleName = ref("");
const bundleVersion = ref("");
const bundleNameTouched = ref(false);
const bundleVersionTouched = ref(false);
const packageDescriptions = ref({});
const packageVersions = ref({});
const packageLatest = ref({});
const packageOptions = ref([]);
const packageJsonFileInput = ref(null);
let searchRequestId = 0;
let noResultsTimer = null;
let searchTimer = null;
const VERSION_PREFIX_REGEX = /^v/;
const VERSION_SPLIT_REGEX = /[.-]/;
const popularPackages = [
    "react",
    "vue",
    "vite",
    "typescript",
    "zod",
    "eslint",
    "prettier",
    "lodash",
];
const packumentCache = new Map();
const searchTermValue = computed(() => searchTerm.value.trim());
const hasSearchResults = computed(() => searchTermValue.value.length >= 1 && packageOptions.value.length > 0);
const inputIcon = computed(() => {
    if (searchLoading.value) {
        return "i-lucide-loader-circle";
    }
    if (searchTermValue.value.length === 0) {
        return "i-lucide-search";
    }
    return hasSearchResults.value
        ? "i-lucide-package-search"
        : "i-lucide-circle-alert";
});
const canAdvance = computed(() => selectedPackages.value.length > 0);
const bundleDefaults = computed(() => {
    const items = selectedPackages.value;
    if (!items.length) {
        return { name: "", version: "" };
    }
    return {
        name: items
            .map((item) => item.name)
            .join("-")
            .replace(/[^a-zA-Z0-9._-]+/g, "-"),
        version: items
            .map((item) => item.version.replace(/[^a-zA-Z0-9._-]+/g, "-"))
            .join("-"),
    };
});
const packageJsonExport = computed(() => JSON.stringify({
    name: `packy-${sanitizePackageName(bundleName.value || bundleDefaults.value.name || "bundle")}`,
    version: bundleVersion.value || bundleDefaults.value.version || "0.0.0",
    private: true,
    dependencies: Object.fromEntries(selectedPackages.value.map((pkg) => [pkg.name, pkg.version])),
}, null, 2));
const searchHint = computed(() => {
    if (searchLoading.value)
        return "Searching the npm registry...";
    if (searchError.value)
        return "Search failed. Check your network and try again.";
    if (searchTermValue.value.length === 0)
        return "Type a package name, or choose a popular package.";
    if (showNoResults.value && packageOptions.value.length === 0)
        return `No packages found for "${searchTermValue.value}".`;
    if (hasSearchResults.value)
        return `${packageOptions.value.length} package${packageOptions.value.length === 1 ? "" : "s"} found`;
    return "Search npm packages by name.";
});
function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
        size /= 1024;
        unit += 1;
    }
    return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
function sanitizePackageName(name) {
    return (name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
        "package");
}
function getVersionOption(name, version) {
    return packageVersions.value[name]?.find((option) => option.value === version);
}
function getSelectedPackageSize(name, version) {
    return getVersionOption(name, version)?.sizeBytes;
}
function createPopularPackageOptions() {
    return popularPackages.map((name) => ({
        label: name,
        value: name,
        description: "Popular package suggestion",
    }));
}
function storePackumentData(packument) {
    const rawVersions = Object.entries(packument.versions ?? {});
    const latest = packument["dist-tags"]?.latest ?? rawVersions.at(-1)?.[0] ?? "latest";
    const versions = rawVersions
        .sort(([left], [right]) => compareVersionsDesc(left, right))
        .map(([version, meta]) => ({
        label: version,
        value: version,
        description: meta.deprecated,
        latest: version === latest,
        deprecated: meta.deprecated,
        sizeBytes: meta.dist?.unpackedSize,
    }));
    packageVersions.value[packument.name] = versions.length
        ? versions
        : [{ label: latest, value: latest, latest: true }];
    packageLatest.value[packument.name] = latest;
    packageDescriptions.value[packument.name] = packument.description ?? "";
    return {
        label: packument.name,
        value: packument.name,
        description: [
            latest,
            packument.description ?? "",
            `${versions.length} versions`,
        ]
            .filter(Boolean)
            .join(" · "),
    };
}
function getCachedPackument(name) {
    const existing = packumentCache.get(name);
    if (existing) {
        return existing;
    }
    const promise = getPackument(name);
    packumentCache.set(name, promise);
    return promise;
}
async function loadPopularPackages() {
    const packuments = await Promise.all(popularPackages.map((name) => getCachedPackument(name)));
    packageOptions.value = packuments.map(storePackumentData);
}
async function importPackageJsonText(text) {
    const manifest = JSON.parse(text);
    const dependencies = Object.entries(manifest.dependencies ?? {});
    if (!dependencies.length) {
        throw new Error("package.json does not contain any dependencies");
    }
    bundleName.value = manifest.name ?? bundleName.value;
    bundleVersion.value = manifest.version ?? bundleVersion.value;
    bundleNameTouched.value = true;
    bundleVersionTouched.value = true;
    const packuments = await Promise.all(dependencies.map(([name]) => getCachedPackument(name)));
    packageOptions.value = packuments.map(storePackumentData);
    selectedPackages.value = dependencies.map(([name, version]) => ({
        name,
        version,
        versions: packageVersions.value[name]?.map((option) => option.value) ?? [version],
        sizeBytes: getSelectedPackageSize(name, version),
    }));
    selectedVersions.value = Object.fromEntries(dependencies);
    searchTerm.value = "";
    pendingPackage.value = "";
}
function exportPackageJson() {
    const blob = new Blob([`${packageJsonExport.value}\n`], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizePackageName(bundleName.value || bundleDefaults.value.name || "packy-bundle")}.package.json`;
    link.click();
    URL.revokeObjectURL(url);
}
async function handlePackageJsonFileChange(event) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file)
        return;
    try {
        await importPackageJsonText(await file.text());
    }
    finally {
        input.value = "";
    }
}
function compareVersionsDesc(a, b) {
    const parse = (value) => value
        .replace(VERSION_PREFIX_REGEX, "")
        .split(VERSION_SPLIT_REGEX)
        .map((part) => (Number.isNaN(Number(part)) ? part : Number(part)));
    const left = parse(a);
    const right = parse(b);
    const length = Math.max(left.length, right.length);
    for (let index = 0; index < length; index += 1) {
        const l = left[index];
        const r = right[index];
        if (l === undefined)
            return 1;
        if (r === undefined)
            return -1;
        if (typeof l === "number" && typeof r === "number") {
            if (l !== r)
                return r - l;
            continue;
        }
        const result = String(r).localeCompare(String(l));
        if (result !== 0)
            return result;
    }
    return 0;
}
function getSelectedVersion(name) {
    return (selectedVersions.value[name] ??
        packageLatest.value[name] ??
        packageVersions.value[name]?.[0] ??
        "latest");
}
async function addSelectedPackage(name) {
    if (!name) {
        return;
    }
    if (selectedPackages.value.some((pkg) => pkg.name === name)) {
        pendingPackage.value = "";
        return;
    }
    selectedPackages.value = [
        ...selectedPackages.value,
        {
            name,
            version: getSelectedVersion(name),
            versions: packageVersions.value[name]?.map((option) => option.value) ?? [getSelectedVersion(name)],
            sizeBytes: getSelectedPackageSize(name, getSelectedVersion(name)),
        },
    ];
    await nextTick();
    pendingPackage.value = "";
    searchTerm.value = "";
}
function removeSelectedPackage(name) {
    selectedPackages.value = selectedPackages.value.filter((pkg) => pkg.name !== name);
    delete selectedVersions.value[name];
}
function updateSelectedPackageVersion(name, version) {
    selectedVersions.value[name] = version;
    selectedPackages.value = selectedPackages.value.map((pkg) => pkg.name === name
        ? {
            ...pkg,
            version,
            sizeBytes: getSelectedPackageSize(name, version),
        }
        : pkg);
}
watch(bundleDefaults, ({ name, version }) => {
    if (!bundleNameTouched.value) {
        bundleName.value = name;
    }
    if (!bundleVersionTouched.value) {
        bundleVersion.value = version;
    }
}, { immediate: true });
const packageColumns = [
    {
        accessorKey: "name",
        header: "Package",
        cell: ({ row }) => h("div", { class: "max-w-xs space-y-1" }, [
            h("p", { class: "truncate font-medium" }, row.getValue("name")),
            h("p", { class: "truncate text-xs text-muted" }, packageDescriptions.value[row.original.name] ?? ""),
        ]),
    },
    {
        accessorKey: "version",
        header: "Version",
        cell: ({ row }) => h(USelectMenu, {
            modelValue: selectedVersions.value[row.original.name] ??
                row.original.version,
            items: packageVersions.value[row.original.name] ??
                [...row.original.versions]
                    .sort(compareVersionsDesc)
                    .map((version) => ({
                    label: version,
                    value: version,
                })),
            class: "w-full max-w-xs",
            searchInput: true,
            portal: true,
            "onUpdate:modelValue": (value) => {
                updateSelectedPackageVersion(row.original.name, value);
            },
        }, {
            item: ({ item }) => {
                const version = item;
                return h("div", {
                    class: "flex w-full items-start justify-between gap-3",
                }, [
                    h("div", { class: "min-w-0" }, [
                        h("div", { class: "flex items-center gap-2" }, [
                            h("span", { class: "font-medium" }, version.label),
                            version.latest
                                ? h(UBadge, {
                                    color: "primary",
                                    variant: "soft",
                                    size: "xs",
                                }, () => "latest")
                                : null,
                            version.deprecated
                                ? h(UBadge, {
                                    color: "error",
                                    variant: "soft",
                                    size: "xs",
                                }, () => "deprecated")
                                : null,
                        ]),
                        h("div", {
                            class: "mt-1 flex flex-wrap gap-2 text-xs text-muted",
                        }, [
                            version.description
                                ? h("span", version.description)
                                : null,
                            version.sizeBytes
                                ? h("span", formatBytes(version.sizeBytes))
                                : null,
                        ]),
                    ]),
                ]);
            },
            "item-trailing": ({ item, }) => {
                const version = item;
                if (!version.deprecated) {
                    return [];
                }
                return [
                    h(UBadge, { color: "error", variant: "soft", size: "xs" }, () => "deprecated"),
                ];
            },
        }),
    },
    {
        id: "links",
        header: "More",
        cell: ({ row }) => {
            const UDropdownMenu = resolveComponent("UDropdownMenu");
            const name = row.original.name;
            const encodedName = encodeURIComponent(name);
            const version = selectedVersions.value[name] ?? row.original.version;
            const encodedVersion = encodeURIComponent(version);
            const items = [
                {
                    label: "View package",
                    icon: "i-lucide-package-search",
                    onClick: () => window.open(`https://npmx.dev/package/${encodedName}/v/${encodedVersion}`, "_blank"),
                },
                {
                    label: "View dependency graph",
                    icon: "i-lucide-network",
                    onClick: () => window.open(`https://node-modules.dev/graph#install=${encodedName}@${encodedVersion}`, "_blank"),
                },
                {
                    label: "View size",
                    icon: "i-lucide-ruler",
                    onClick: () => window.open(`https://pkg-size.dev/${encodedName}@${encodedVersion}`, "_blank"),
                },
            ];
            return h(UDropdownMenu, {
                items: [items],
                content: {
                    align: "start",
                    side: "bottom",
                },
            }, {
                default: () => h(UButton, {
                    icon: "i-lucide-ellipsis-vertical",
                    color: "neutral",
                    variant: "ghost",
                    size: "xs",
                    square: true,
                }),
            });
        },
        meta: {
            class: {
                td: "w-12 text-right",
            },
        },
    },
    {
        id: "actions",
        header: "",
        cell: ({ row }) => h(UButton, {
            icon: "i-lucide-x",
            color: "neutral",
            variant: "ghost",
            size: "xs",
            square: true,
            onClick: () => {
                removeSelectedPackage(row.original.name);
            },
        }),
        meta: {
            class: {
                td: "w-12 text-right",
            },
        },
    },
];
async function searchPackages(term) {
    const value = term.trim();
    const requestId = ++searchRequestId;
    if (noResultsTimer) {
        clearTimeout(noResultsTimer);
        noResultsTimer = null;
    }
    showNoResults.value = false;
    if (value.length === 0) {
        packageOptions.value = createPopularPackageOptions();
        searchError.value = "";
        searchLoading.value = false;
        return;
    }
    if (value.length < 3) {
        searchLoading.value = true;
        searchError.value = "";
        try {
            const packument = await getCachedPackument(value);
            if (requestId !== searchRequestId) {
                return;
            }
            packageOptions.value = [storePackumentData(packument)];
            showNoResults.value = false;
        }
        catch {
            if (requestId !== searchRequestId) {
                return;
            }
            packageOptions.value = [];
            noResultsTimer = setTimeout(() => {
                if (requestId === searchRequestId) {
                    showNoResults.value = true;
                }
            }, 250);
        }
        finally {
            if (requestId === searchRequestId) {
                searchLoading.value = false;
            }
        }
        return;
    }
    searchLoading.value = true;
    searchError.value = "";
    try {
        const results = await searchRegistryPackages(value);
        if (requestId !== searchRequestId) {
            return;
        }
        if (results.length) {
            packageOptions.value = results.map((result) => {
                const rawVersions = Object.entries(result.versions ?? {});
                const latest = result["dist-tags"]?.latest ??
                    rawVersions.at(-1)?.[0] ??
                    "latest";
                const versions = rawVersions
                    .sort(([left], [right]) => compareVersionsDesc(left, right))
                    .map(([version, meta]) => ({
                    label: version,
                    value: version,
                    description: meta.deprecated,
                    latest: version === latest,
                    deprecated: meta.deprecated,
                    sizeBytes: meta.dist?.unpackedSize,
                }));
                packageVersions.value[result.name] = versions.length
                    ? versions
                    : [{ label: latest, value: latest, latest: true }];
                packageLatest.value[result.name] = latest;
                packageDescriptions.value[result.name] =
                    result.description ?? "";
                return {
                    label: result.name,
                    value: result.name,
                    description: [
                        latest,
                        result.description ?? "",
                        `${versions.length} versions`,
                    ]
                        .filter(Boolean)
                        .join(" · "),
                };
            });
            showNoResults.value = false;
        }
        else {
            packageOptions.value = [];
            noResultsTimer = setTimeout(() => {
                if (requestId === searchRequestId) {
                    showNoResults.value = true;
                }
            }, 250);
        }
    }
    catch (error) {
        if (requestId !== searchRequestId) {
            return;
        }
        searchError.value =
            error instanceof Error ? error.message : String(error);
    }
    finally {
        if (requestId === searchRequestId) {
            searchLoading.value = false;
        }
    }
}
watch(searchTerm, (term) => {
    if (searchTimer) {
        clearTimeout(searchTimer);
    }
    if (term.trim().length < 3) {
        void searchPackages(term);
        return;
    }
    searchTimer = setTimeout(() => {
        void searchPackages(term);
    }, 300);
});
function handleShortcut(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        goNext();
        return;
    }
    const target = event.target;
    const isEditing = Boolean(target &&
        (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable));
    if (isEditing &&
        !searchTermValue.value &&
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedPackages.value.length) {
        event.preventDefault();
        removeSelectedPackage(selectedPackages.value?.at(-1)?.name || "");
    }
}
onBeforeUnmount(() => {
    if (searchTimer) {
        clearTimeout(searchTimer);
    }
    if (noResultsTimer) {
        clearTimeout(noResultsTimer);
    }
    window.removeEventListener("keydown", handleShortcut);
});
onMounted(() => {
    window.addEventListener("keydown", handleShortcut);
    void loadPopularPackages();
});
function goNext() {
    if (canAdvance.value) {
        emit("advance", {
            packages: selectedPackages.value.map(({ name, version }) => ({
                name,
                version,
            })),
            bundleName: bundleName.value || bundleDefaults.value.name,
            bundleVersion: bundleVersion.value || bundleDefaults.value.version,
        });
    }
}
const items = computed(() => [
    [
        {
            label: "Import package.json",
            icon: "i-lucide:file-import",
            onClick: () => {
                packageJsonFileInput.value?.click();
            },
        },
    ],
    [
        {
            label: "Export package.json",
            icon: "i-lucide:file-export",
            onClick: exportPackageJson,
            disabled: selectedPackages.value.length === 0,
        },
    ],
]);
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
let __VLS_0;
/** @ts-ignore @type {typeof __VLS_components.UCard | typeof __VLS_components.UCard} */
UCard;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent1(__VLS_0, new __VLS_0({
    variant: "outline",
}));
const __VLS_2 = __VLS_1({
    variant: "outline",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_5 = {};
const { default: __VLS_6 } = __VLS_3.slots;
{
    const { header: __VLS_7 } = __VLS_3.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    /** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
    /** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:flex-row']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:items-center']} */ ;
    /** @type {__VLS_StyleScopedClasses['sm:justify-between']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({});
    __VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
        ...{ class: "text-xl font-semibold" },
    });
    /** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
    /** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "flex" },
    });
    /** @type {__VLS_StyleScopedClasses['flex']} */ ;
    let __VLS_8;
    /** @ts-ignore @type {typeof __VLS_components.UDropdownMenu | typeof __VLS_components.UDropdownMenu} */
    UDropdownMenu;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent1(__VLS_8, new __VLS_8({
        items: (__VLS_ctx.items),
        content: ({
            align: 'end',
            side: 'bottom',
        }),
    }));
    const __VLS_10 = __VLS_9({
        items: (__VLS_ctx.items),
        content: ({
            align: 'end',
            side: 'bottom',
        }),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    const { default: __VLS_13 } = __VLS_11.slots;
    let __VLS_14;
    /** @ts-ignore @type {typeof __VLS_components.UButton} */
    UButton;
    // @ts-ignore
    const __VLS_15 = __VLS_asFunctionalComponent1(__VLS_14, new __VLS_14({
        color: "neutral",
        variant: "ghost",
        icon: "i-lucide:ellipsis-vertical",
    }));
    const __VLS_16 = __VLS_15({
        color: "neutral",
        variant: "ghost",
        icon: "i-lucide:ellipsis-vertical",
    }, ...__VLS_functionalComponentArgsRest(__VLS_15));
    // @ts-ignore
    [items,];
    var __VLS_11;
    __VLS_asFunctionalElement1(__VLS_intrinsics.input)({
        ...{ onChange: (__VLS_ctx.handlePackageJsonFileChange) },
        ref: "packageJsonFileInput",
        type: "file",
        accept: "application/json,.json",
        ...{ class: "hidden" },
    });
    /** @type {__VLS_StyleScopedClasses['hidden']} */ ;
    // @ts-ignore
    [handlePackageJsonFileChange,];
}
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-5" },
});
/** @type {__VLS_StyleScopedClasses['space-y-5']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "grid gap-4 sm:grid-cols-2" },
});
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-4']} */ ;
/** @type {__VLS_StyleScopedClasses['sm:grid-cols-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-2" },
});
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "text-sm font-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
let __VLS_19;
/** @ts-ignore @type {typeof __VLS_components.UInput} */
UInput;
// @ts-ignore
const __VLS_20 = __VLS_asFunctionalComponent1(__VLS_19, new __VLS_19({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.bundleName),
    placeholder: "My bundle",
    ...{ class: "w-full" },
}));
const __VLS_21 = __VLS_20({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.bundleName),
    placeholder: "My bundle",
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_20));
let __VLS_24;
const __VLS_25 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (() => {
            __VLS_ctx.bundleNameTouched = true;
        }) });
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
var __VLS_22;
var __VLS_23;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-2" },
});
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "text-sm font-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
let __VLS_26;
/** @ts-ignore @type {typeof __VLS_components.UInput} */
UInput;
// @ts-ignore
const __VLS_27 = __VLS_asFunctionalComponent1(__VLS_26, new __VLS_26({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.bundleVersion),
    placeholder: "1.0.0",
    ...{ class: "w-full" },
}));
const __VLS_28 = __VLS_27({
    ...{ 'onUpdate:modelValue': {} },
    modelValue: (__VLS_ctx.bundleVersion),
    placeholder: "1.0.0",
    ...{ class: "w-full" },
}, ...__VLS_functionalComponentArgsRest(__VLS_27));
let __VLS_31;
const __VLS_32 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (() => {
            __VLS_ctx.bundleVersionTouched = true;
        }) });
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
var __VLS_29;
var __VLS_30;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "space-y-2" },
});
/** @type {__VLS_StyleScopedClasses['space-y-2']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.label, __VLS_intrinsics.label)({
    ...{ class: "text-sm font-medium" },
});
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
let __VLS_33;
/** @ts-ignore @type {typeof __VLS_components.UInputMenu | typeof __VLS_components.UInputMenu} */
UInputMenu;
// @ts-ignore
const __VLS_34 = __VLS_asFunctionalComponent1(__VLS_33, new __VLS_33({
    ...{ 'onKeydown': {} },
    ...{ 'onUpdate:modelValue': {} },
    ...{ 'onUpdate:open': {} },
    modelValue: (__VLS_ctx.pendingPackage),
    searchTerm: (__VLS_ctx.searchTerm),
    items: (__VLS_ctx.packageOptions),
    valueKey: "value",
    labelKey: "label",
    placeholder: "Pick one package",
    ...{ class: "w-full" },
    loading: (__VLS_ctx.searchLoading),
    createItem: (false),
    content: ({ hideWhenEmpty: false }),
    ignoreFilter: (true),
    resetSearchTermOnBlur: (false),
    'aria-label': "Search npm packages",
}));
const __VLS_35 = __VLS_34({
    ...{ 'onKeydown': {} },
    ...{ 'onUpdate:modelValue': {} },
    ...{ 'onUpdate:open': {} },
    modelValue: (__VLS_ctx.pendingPackage),
    searchTerm: (__VLS_ctx.searchTerm),
    items: (__VLS_ctx.packageOptions),
    valueKey: "value",
    labelKey: "label",
    placeholder: "Pick one package",
    ...{ class: "w-full" },
    loading: (__VLS_ctx.searchLoading),
    createItem: (false),
    content: ({ hideWhenEmpty: false }),
    ignoreFilter: (true),
    resetSearchTermOnBlur: (false),
    'aria-label': "Search npm packages",
}, ...__VLS_functionalComponentArgsRest(__VLS_34));
let __VLS_38;
const __VLS_39 = ({ keydown: {} },
    { onKeydown: () => { } });
const __VLS_40 = ({ 'update:modelValue': {} },
    { 'onUpdate:modelValue': (__VLS_ctx.addSelectedPackage) });
const __VLS_41 = ({ 'update:open': {} },
    { 'onUpdate:open': ((open) => open && __VLS_ctx.searchPackages(__VLS_ctx.searchTerm)) });
/** @type {__VLS_StyleScopedClasses['w-full']} */ ;
const { default: __VLS_42 } = __VLS_36.slots;
{
    const { leading: __VLS_43 } = __VLS_36.slots;
    let __VLS_44;
    /** @ts-ignore @type {typeof __VLS_components.UIcon} */
    UIcon;
    // @ts-ignore
    const __VLS_45 = __VLS_asFunctionalComponent1(__VLS_44, new __VLS_44({
        name: (__VLS_ctx.inputIcon),
        ...{ class: "text-muted shrink-0" },
        ...{ class: (__VLS_ctx.searchLoading ? 'animate-spin' : '') },
    }));
    const __VLS_46 = __VLS_45({
        name: (__VLS_ctx.inputIcon),
        ...{ class: "text-muted shrink-0" },
        ...{ class: (__VLS_ctx.searchLoading ? 'animate-spin' : '') },
    }, ...__VLS_functionalComponentArgsRest(__VLS_45));
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['shrink-0']} */ ;
    // @ts-ignore
    [bundleName, bundleNameTouched, bundleVersion, bundleVersionTouched, pendingPackage, searchTerm, searchTerm, packageOptions, searchLoading, searchLoading, addSelectedPackage, searchPackages, inputIcon,];
}
{
    const { empty: __VLS_49 } = __VLS_36.slots;
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "text-muted min-h-10 px-3 py-2 text-sm" },
    });
    /** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
    /** @type {__VLS_StyleScopedClasses['min-h-10']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
    __VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({});
    (__VLS_ctx.searchHint);
    // @ts-ignore
    [searchHint,];
}
// @ts-ignore
[];
var __VLS_36;
var __VLS_37;
if (__VLS_ctx.searchError) {
    __VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
        ...{ class: "border-error/30 bg-error/10 text-error mt-1 rounded-md border px-3 py-2 text-xs" },
    });
    /** @type {__VLS_StyleScopedClasses['border-error/30']} */ ;
    /** @type {__VLS_StyleScopedClasses['bg-error/10']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-error']} */ ;
    /** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
    /** @type {__VLS_StyleScopedClasses['rounded-md']} */ ;
    /** @type {__VLS_StyleScopedClasses['border']} */ ;
    /** @type {__VLS_StyleScopedClasses['px-3']} */ ;
    /** @type {__VLS_StyleScopedClasses['py-2']} */ ;
    /** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
    (__VLS_ctx.searchError);
}
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "text-muted mt-2 text-xs" },
});
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
let __VLS_50;
/** @ts-ignore @type {typeof __VLS_components.UKbd} */
UKbd;
// @ts-ignore
const __VLS_51 = __VLS_asFunctionalComponent1(__VLS_50, new __VLS_50({
    value: "meta",
}));
const __VLS_52 = __VLS_51({
    value: "meta",
}, ...__VLS_functionalComponentArgsRest(__VLS_51));
let __VLS_55;
/** @ts-ignore @type {typeof __VLS_components.UKbd} */
UKbd;
// @ts-ignore
const __VLS_56 = __VLS_asFunctionalComponent1(__VLS_55, new __VLS_55({
    value: "enter",
}));
const __VLS_57 = __VLS_56({
    value: "enter",
}, ...__VLS_functionalComponentArgsRest(__VLS_56));
let __VLS_60;
/** @ts-ignore @type {typeof __VLS_components.UKbd} */
UKbd;
// @ts-ignore
const __VLS_61 = __VLS_asFunctionalComponent1(__VLS_60, new __VLS_60({
    value: "backspace",
}));
const __VLS_62 = __VLS_61({
    value: "backspace",
}, ...__VLS_functionalComponentArgsRest(__VLS_61));
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mb-3 flex items-center justify-between gap-3" },
});
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "font-medium" },
});
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
let __VLS_65;
/** @ts-ignore @type {typeof __VLS_components.UBadge | typeof __VLS_components.UBadge} */
UBadge;
// @ts-ignore
const __VLS_66 = __VLS_asFunctionalComponent1(__VLS_65, new __VLS_65({
    color: "primary",
    variant: "soft",
}));
const __VLS_67 = __VLS_66({
    color: "primary",
    variant: "soft",
}, ...__VLS_functionalComponentArgsRest(__VLS_66));
const { default: __VLS_70 } = __VLS_68.slots;
(__VLS_ctx.selectedPackages.length);
// @ts-ignore
[searchError, searchError, selectedPackages,];
var __VLS_68;
let __VLS_71;
/** @ts-ignore @type {typeof __VLS_components.UTable} */
UTable;
// @ts-ignore
const __VLS_72 = __VLS_asFunctionalComponent1(__VLS_71, new __VLS_71({
    data: (__VLS_ctx.selectedPackages),
    columns: (__VLS_ctx.packageColumns),
    ...{ class: "border-default overflow-hidden rounded-lg border" },
}));
const __VLS_73 = __VLS_72({
    data: (__VLS_ctx.selectedPackages),
    columns: (__VLS_ctx.packageColumns),
    ...{ class: "border-default overflow-hidden rounded-lg border" },
}, ...__VLS_functionalComponentArgsRest(__VLS_72));
/** @type {__VLS_StyleScopedClasses['border-default']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.div, __VLS_intrinsics.div)({
    ...{ class: "mt-4 flex justify-end" },
});
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-end']} */ ;
let __VLS_76;
/** @ts-ignore @type {typeof __VLS_components.UButton | typeof __VLS_components.UButton} */
UButton;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent1(__VLS_76, new __VLS_76({
    ...{ 'onClick': {} },
    color: "primary",
    icon: "i-lucide-arrow-right",
    disabled: (!__VLS_ctx.canAdvance),
}));
const __VLS_78 = __VLS_77({
    ...{ 'onClick': {} },
    color: "primary",
    icon: "i-lucide-arrow-right",
    disabled: (!__VLS_ctx.canAdvance),
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
let __VLS_81;
const __VLS_82 = ({ click: {} },
    { onClick: (__VLS_ctx.goNext) });
const { default: __VLS_83 } = __VLS_79.slots;
// @ts-ignore
[selectedPackages, packageColumns, canAdvance, goNext,];
var __VLS_79;
var __VLS_80;
// @ts-ignore
[];
var __VLS_3;
// @ts-ignore
[];
const __VLS_export = (await import('vue')).defineComponent({
    __typeEmits: {},
});
export default {};
