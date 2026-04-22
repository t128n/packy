<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import {
	computed,
	h,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	resolveComponent,
	watch,
} from "vue";

import {
	getPackument,
	searchPackages as searchRegistryPackages,
} from "~/lib/npm-registry";

const emit = defineEmits<{
	advance: [
		payload: {
			packages: Array<{ name: string; version: string }>;
			bundleName: string;
			bundleVersion: string;
			bundleMethod: "slim-bundle" | "full-bundle";
		},
	];
}>();

type PackageItem = {
	name: string;
	version: string;
	versions: string[];
	sizeBytes?: number;
};

type PackageVersionOption = {
	label: string;
	value: string;
	description?: string;
	latest?: boolean;
	deprecated?: string;
	sizeBytes?: number;
};

type PackageVersionMenuItem = PackageVersionOption;

type PackageOption = {
	label: string;
	value: string;
	description: string;
};

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UIcon = resolveComponent("UIcon");
const USelectMenu = resolveComponent("USelectMenu");
const UTable = resolveComponent("UTable");

const selectedPackages = ref<PackageItem[]>([]);
const pendingPackage = ref("");
const selectedVersions = ref<Record<string, string>>({});
const bundleMethod = ref<"slim-bundle" | "full-bundle">("slim-bundle");
const searchTerm = ref("");
const searchLoading = ref(false);
const searchError = ref("");
const showNoResults = ref(false);
const bundleName = ref("");
const bundleVersion = ref("");
const bundleNameTouched = ref(false);
const bundleVersionTouched = ref(false);
const packageDescriptions = ref<Record<string, string>>({});
const packageVersions = ref<Record<string, PackageVersionOption[]>>({});
const packageLatest = ref<Record<string, string>>({});
const packageOptions = ref<PackageOption[]>([]);
const packageJsonFileInput = ref<HTMLInputElement | null>(null);
let searchRequestId = 0;
let noResultsTimer: ReturnType<typeof setTimeout> | null = null;
let searchTimer: ReturnType<typeof setTimeout> | null = null;

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
const packumentCache = new Map<string, ReturnType<typeof getPackument>>();

const searchTermValue = computed(() => searchTerm.value.trim());
const hasSearchResults = computed(
	() => searchTermValue.value.length >= 1 && packageOptions.value.length > 0,
);
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

const packageJsonExport = computed(() =>
	JSON.stringify(
		{
			name: `packy-${sanitizePackageName(bundleName.value || bundleDefaults.value.name || "bundle")}`,
			version:
				bundleVersion.value || bundleDefaults.value.version || "0.0.0",
			private: true,
			dependencies: Object.fromEntries(
				selectedPackages.value.map((pkg) => [pkg.name, pkg.version]),
			),
		},
		null,
		2,
	),
);

const searchHint = computed(() => {
	if (searchLoading.value) return "Searching the npm registry...";
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

function formatBytes(bytes: number) {
	const units = ["B", "KB", "MB", "GB"];
	let size = bytes;
	let unit = 0;

	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}

	return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function sanitizePackageName(name: string) {
	return (
		name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
		"package"
	);
}

function getVersionOption(name: string, version: string) {
	return packageVersions.value[name]?.find(
		(option) => option.value === version,
	);
}

function getSelectedPackageSize(name: string, version: string) {
	return getVersionOption(name, version)?.sizeBytes;
}

function createPopularPackageOptions(): PackageOption[] {
	return popularPackages.map((name) => ({
		label: name,
		value: name,
		description: "Popular package suggestion",
	}));
}

function storePackumentData(
	packument: Awaited<ReturnType<typeof getPackument>>,
) {
	const rawVersions = Object.entries(packument.versions ?? {});
	const latest =
		packument["dist-tags"]?.latest ?? rawVersions.at(-1)?.[0] ?? "latest";
	const versions: PackageVersionOption[] = rawVersions
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

function getCachedPackument(name: string) {
	const existing = packumentCache.get(name);
	if (existing) {
		return existing;
	}

	const promise = getPackument(name);
	packumentCache.set(name, promise);
	return promise;
}

async function loadPopularPackages() {
	const packuments = await Promise.all(
		popularPackages.map((name) => getCachedPackument(name)),
	);
	packageOptions.value = packuments.map(storePackumentData);
}

async function importPackageJsonText(text: string) {
	const manifest = JSON.parse(text) as {
		name?: string;
		version?: string;
		dependencies?: Record<string, string>;
	};

	const dependencies = Object.entries(manifest.dependencies ?? {});
	if (!dependencies.length) {
		throw new Error("package.json does not contain any dependencies");
	}

	bundleName.value = manifest.name ?? bundleName.value;
	bundleVersion.value = manifest.version ?? bundleVersion.value;
	bundleNameTouched.value = true;
	bundleVersionTouched.value = true;

	const packuments = await Promise.all(
		dependencies.map(([name]) => getCachedPackument(name)),
	);
	packageOptions.value = packuments.map(storePackumentData);

	selectedPackages.value = dependencies.map(([name, version]) => ({
		name,
		version,
		versions: packageVersions.value[name]?.map(
			(option) => option.value,
		) ?? [version],
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

async function handlePackageJsonFileChange(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;

	try {
		await importPackageJsonText(await file.text());
	} finally {
		input.value = "";
	}
}

function compareVersionsDesc(a: string, b: string) {
	const parse = (value: string) =>
		value
			.replace(VERSION_PREFIX_REGEX, "")
			.split(VERSION_SPLIT_REGEX)
			.map((part) => (Number.isNaN(Number(part)) ? part : Number(part)));

	const left = parse(a);
	const right = parse(b);
	const length = Math.max(left.length, right.length);

	for (let index = 0; index < length; index += 1) {
		const l = left[index];
		const r = right[index];

		if (l === undefined) return 1;
		if (r === undefined) return -1;

		if (typeof l === "number" && typeof r === "number") {
			if (l !== r) return r - l;
			continue;
		}

		const result = String(r).localeCompare(String(l));
		if (result !== 0) return result;
	}

	return 0;
}

function getSelectedVersion(name: string) {
	return (
		selectedVersions.value[name] ??
		packageLatest.value[name] ??
		packageVersions.value[name]?.[0] ??
		"latest"
	);
}

async function addSelectedPackage(name: string) {
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
			versions: packageVersions.value[name]?.map(
				(option) => option.value,
			) ?? [getSelectedVersion(name)],
			sizeBytes: getSelectedPackageSize(name, getSelectedVersion(name)),
		},
	];

	await nextTick();
	pendingPackage.value = "";
	searchTerm.value = "";
}

function removeSelectedPackage(name: string) {
	selectedPackages.value = selectedPackages.value.filter(
		(pkg) => pkg.name !== name,
	);
	delete selectedVersions.value[name];
}

function updateSelectedPackageVersion(name: string, version: string) {
	selectedVersions.value[name] = version;
	selectedPackages.value = selectedPackages.value.map((pkg) =>
		pkg.name === name
			? {
					...pkg,
					version,
					sizeBytes: getSelectedPackageSize(name, version),
				}
			: pkg,
	);
}

watch(
	bundleDefaults,
	({ name, version }) => {
		if (!bundleNameTouched.value) {
			bundleName.value = name;
		}

		if (!bundleVersionTouched.value) {
			bundleVersion.value = version;
		}
	},
	{ immediate: true },
);

const packageColumns: TableColumn<PackageItem>[] = [
	{
		accessorKey: "name",
		header: "Package",
		cell: ({ row }) =>
			h("div", { class: "max-w-xs space-y-1" }, [
				h("p", { class: "truncate font-medium" }, row.getValue("name")),
				h(
					"p",
					{ class: "truncate text-xs text-muted" },
					packageDescriptions.value[row.original.name] ?? "",
				),
			]),
	},
	{
		accessorKey: "version",
		header: "Version",
		cell: ({ row }) =>
				h(
					USelectMenu,
					{
						modelValue:
							selectedVersions.value[row.original.name] ??
							row.original.version,
						items:
							packageVersions.value[row.original.name] ??
							[...row.original.versions]
								.sort(compareVersionsDesc)
								.map((version: string) => ({
									label: version,
									value: version,
								})),
					class: "w-full max-w-xs",
					searchInput: true,
					portal: true,
					"onUpdate:modelValue": (value: string) => {
						updateSelectedPackageVersion(row.original.name, value);
					},
				},
				{
					item: ({ item }: { item: PackageVersionMenuItem }) => {
						const version = item;

						return h(
							"div",
							{
								class: "flex w-full items-start justify-between gap-3",
							},
							[
								h("div", { class: "min-w-0" }, [
									h(
										"div",
										{ class: "flex items-center gap-2" },
										[
											h(
												"span",
												{ class: "font-medium" },
												version.label,
											),
											version.latest
												? h(
														UBadge,
														{
															color: "primary",
															variant: "soft",
															size: "xs",
														},
														() => "latest",
													)
												: null,
											version.deprecated
												? h(
														UBadge,
														{
															color: "error",
															variant: "soft",
															size: "xs",
														},
														() => "deprecated",
													)
												: null,
										],
									),
									h(
										"div",
										{
											class: "mt-1 flex flex-wrap gap-2 text-xs text-muted",
										},
										[
											version.description
												? h("span", version.description)
												: null,
											version.sizeBytes
												? h(
														"span",
														formatBytes(
															version.sizeBytes,
														),
													)
												: null,
										],
									),
								]),
							],
						);
					},
					"item-trailing": ({
						item,
					}: {
						item: PackageVersionMenuItem;
					}) => {
						const version = item;

						if (!version.deprecated) {
							return [];
						}

						return [
							h(
								UBadge,
								{ color: "error", variant: "soft", size: "xs" },
								() => "deprecated",
							),
						];
					},
				},
			),
	},
	{
		id: "links",
		header: "More",
		cell: ({ row }) => {
			const UDropdownMenu = resolveComponent("UDropdownMenu");
			const name = row.original.name;
			const encodedName = encodeURIComponent(name);
			const version =
				selectedVersions.value[name] ?? row.original.version;
			const encodedVersion = encodeURIComponent(version);

			const items = [
				{
					label: "View package",
					icon: "i-lucide-package-search",
					onClick: () =>
						window.open(
							`https://npmx.dev/package/${encodedName}/v/${encodedVersion}`,
							"_blank",
						),
				},
				{
					label: "View dependency graph",
					icon: "i-lucide-network",
					onClick: () =>
						window.open(
							`https://node-modules.dev/graph#install=${encodedName}@${encodedVersion}`,
							"_blank",
						),
				},
				{
					label: "View size",
					icon: "i-lucide-ruler",
					onClick: () =>
						window.open(
							`https://pkg-size.dev/${encodedName}@${encodedVersion}`,
							"_blank",
						),
				},
			];

			return h(
				UDropdownMenu,
				{
					items: [items],
					content: {
						align: "start",
						side: "bottom",
					},
				},
				{
					default: () =>
						h(UButton, {
							icon: "i-lucide-ellipsis-vertical",
							color: "neutral",
							variant: "ghost",
							size: "xs",
							square: true,
						}),
				},
			);
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
		cell: ({ row }) =>
			h(UButton, {
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

async function searchPackages(term: string) {
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
		} catch {
			if (requestId !== searchRequestId) {
				return;
			}

			packageOptions.value = [];
			noResultsTimer = setTimeout(() => {
				if (requestId === searchRequestId) {
					showNoResults.value = true;
				}
			}, 250);
		} finally {
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
				const latest =
					result["dist-tags"]?.latest ??
					rawVersions.at(-1)?.[0] ??
					"latest";
				const versions: PackageVersionOption[] = rawVersions
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
		} else {
			packageOptions.value = [];
			noResultsTimer = setTimeout(() => {
				if (requestId === searchRequestId) {
					showNoResults.value = true;
				}
			}, 250);
		}
	} catch (error) {
		if (requestId !== searchRequestId) {
			return;
		}

		searchError.value =
			error instanceof Error ? error.message : String(error);
	} finally {
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

function handleShortcut(event: KeyboardEvent) {
	if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
		event.preventDefault();
		goNext();
		return;
	}

	const target = event.target as HTMLElement | null;
	const isEditing = Boolean(
		target &&
		(target.tagName === "INPUT" ||
			target.tagName === "TEXTAREA" ||
			target.isContentEditable),
	);
	if (
		isEditing &&
		!searchTermValue.value &&
		(event.key === "Backspace" || event.key === "Delete") &&
		selectedPackages.value.length
	) {
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
			bundleMethod: bundleMethod.value,
		});
	}
}

import type { DropdownMenuItem } from "@nuxt/ui";

const items = computed<DropdownMenuItem[][]>(() => [
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
</script>

<template>
	<UCard variant="outline">
		<template #header>
			<div
				class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
			>
				<div>
					<h2 class="text-xl font-semibold">Pick packages</h2>
				</div>
				<div class="flex">
					<UDropdownMenu
						:items="items"
						:content="{
							align: 'end',
							side: 'bottom',
						}"
					>
						<UButton
							color="neutral"
							variant="ghost"
							icon="i-lucide:ellipsis-vertical"
						/>
					</UDropdownMenu>

					<input
						ref="packageJsonFileInput"
						type="file"
						accept="application/json,.json"
						class="hidden"
						@change="handlePackageJsonFileChange"
					/>
				</div>
			</div>
		</template>

		<div class="space-y-5">
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<label class="text-sm font-medium">Bundle name</label>
					<UInput
						v-model="bundleName"
						placeholder="My bundle"
						class="w-full"
						:disabled="
							bundleMethod === 'slim-bundle' &&
							selectedPackages.length === 1
						"
						@update:model-value="
							() => {
								bundleNameTouched = true;
							}
						"
					/>
				</div>
				<div class="space-y-2">
					<label class="text-sm font-medium">Bundle version</label>
					<UInput
						v-model="bundleVersion"
						placeholder="1.0.0"
						class="w-full"
						:disabled="
							bundleMethod === 'slim-bundle' &&
							selectedPackages.length === 1
						"
						@update:model-value="
							() => {
								bundleVersionTouched = true;
							}
						"
					/>
				</div>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium">Bundling method</label>
				<URadioGroup
					v-model="bundleMethod"
					class="w-full"
					:items="[
						{
							value: 'slim-bundle',
							label: 'Slim bundle (default)',
							description:
								selectedPackages.length === 1
									? `Packs ${selectedPackages[0].name} directly with its dependencies.`
									: 'Packs all packages into a portable bundle.',
						},
						{
							value: 'full-bundle',
							label: 'Full bundle',
							description:
								'Always wraps packages in a new bundle container.',
						},
					]"
				/>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium">Search packages</label>
				<UInputMenu
					v-model="pendingPackage"
					v-model:search-term="searchTerm"
					:items="packageOptions"
					value-key="value"
					label-key="label"
					placeholder="Pick one package"
					class="w-full"
					:loading="searchLoading"
					:create-item="false"
					:content="{ hideWhenEmpty: false }"
					:ignore-filter="true"
					:reset-search-term-on-blur="false"
					aria-label="Search npm packages"
					@keydown.enter.prevent
					@update:model-value="addSelectedPackage"
					@update:open="(open: boolean) => open && searchPackages(searchTerm)"
				>
					<template #leading>
						<UIcon
							:name="inputIcon"
							class="text-muted shrink-0"
							:class="searchLoading ? 'animate-spin' : ''"
						/>
					</template>
					<template #empty>
						<div class="text-muted min-h-10 px-3 py-2 text-sm">
							<p>{{ searchHint }}</p>
						</div>
					</template>
				</UInputMenu>
				<div
					v-if="searchError"
					class="border-error/30 bg-error/10 text-error mt-1 rounded-md border px-3 py-2 text-xs"
				>
					{{ searchError }} Try a different package name or import a
					package.json.
				</div>
				<p class="text-muted mt-2 text-xs">
					<UKbd value="meta" /> + <UKbd value="enter" /> continues.
					<UKbd value="backspace" /> removes the last selected package
					when the search field is empty.
				</p>
			</div>

			<div class="mb-3 flex items-center justify-between gap-3">
				<p class="font-medium">Selected packages</p>
				<UBadge color="primary" variant="soft">{{
					selectedPackages.length
				}}</UBadge>
			</div>

			<UTable
				:data="selectedPackages"
				:columns="packageColumns"
				class="border-default overflow-hidden rounded-lg border"
			/>
		</div>

		<div class="mt-4 flex justify-end">
			<UButton
				color="primary"
				icon="i-lucide-arrow-right"
				:disabled="!canAdvance"
				@click="goNext"
			>
				Start bundling
			</UButton>
		</div>
	</UCard>
</template>
