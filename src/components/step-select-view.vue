<script setup lang="ts">
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	ref,
	watch,
} from "vue";

import { useWebcontainer } from "~/composables/use-webcontainer";
import {
	getPackument,
	searchPackages as searchRegistryPackages,
	type RegistryPackument,
} from "~/lib/npm-registry";
import type {
	BundleMethod,
	PackageVersion,
	SelectAdvancePayload,
	SelectedPackage,
} from "~/lib/packy";
import { formatBytes } from "~/lib/packy";

type SearchResult = SelectedPackage & {
	latest: string;
	versionCount: number;
};

const emit = defineEmits<{
	advance: [payload: SelectAdvancePayload];
}>();

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

const VERSION_PREFIX_REGEX = /^v/;
const VERSION_SPLIT_REGEX = /[.-]/;
const INVALID_NAME_REGEX = /[^a-zA-Z0-9._-]+/g;
const EDGE_DASH_REGEX = /^-+|-+$/g;
const PACKAGE_NAME_REGEX = /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/;
const EXACT_VERSION_REGEX = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const NOT_FOUND_REGEX = /(?:^|\D)404(?:\D|$)/;
const NETWORK_ERROR_REGEX =
	/NetworkError|Failed to fetch|no response|Network request failed/i;

const webcontainer = useWebcontainer();
const isolationAvailable = crossOriginIsolated;
const selectedPackages = ref<SelectedPackage[]>([]);
const bundleMethod = ref<BundleMethod>("slim-bundle");
const bundleName = ref("");
const bundleVersion = ref("");
const bundleNameTouched = ref(false);
const bundleVersionTouched = ref(false);
const bundleNameError = ref("");
const bundleVersionError = ref("");
const bundleNameInput = ref<HTMLInputElement | null>(null);
const bundleVersionInput = ref<HTMLInputElement | null>(null);
const searchTerm = ref("");
const lastSearchTerm = ref("");
const searchLoading = ref(false);
const searchError = ref("");
const searchRetryTerm = ref("");
const searchAnnouncement = ref("");
const searchResults = ref<SearchResult[]>([]);
const hasSearched = ref(false);
const addingPackage = ref("");
const importError = ref("");
const importWarning = ref("");
const importing = ref(false);
const selectionAnnouncement = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const packageSection = ref<HTMLElement | null>(null);
const packageJsonFileInput = ref<HTMLInputElement | null>(null);
let searchRequestId = 0;
let importRequestId = 0;

const runtimeError = computed(() => {
	const error = webcontainer.error.value;
	if (!error) {
		return "";
	}

	return error instanceof Error ? error.message : String(error);
});

const canAdvance = computed(() => selectedPackages.value.length > 0);
const bundleErrorCount = computed(
	() =>
		Number(Boolean(bundleNameError.value)) +
		Number(Boolean(bundleVersionError.value)),
);
const isSingleSlim = computed(
	() =>
		bundleMethod.value === "slim-bundle" &&
		selectedPackages.value.length === 1,
);
const slimVersionNeedsExact = computed(() => {
	if (!isSingleSlim.value) {
		return false;
	}

	const selected = selectedPackages.value[0];
	return Boolean(selected && !EXACT_VERSION_REGEX.test(selected.version));
});

const canBundle = computed(
	() =>
		canAdvance.value &&
		isolationAvailable &&
		!slimVersionNeedsExact.value &&
		!importing.value &&
		!addingPackage.value,
);

const bundleDefaults = computed(() => {
	if (!selectedPackages.value.length) {
		return { name: "", version: "" };
	}

	return {
		name: selectedPackages.value
			.map((item) => item.name)
			.join("-")
			.replace(INVALID_NAME_REGEX, "-")
			.replace(EDGE_DASH_REGEX, ""),
		version: selectedPackages.value.every((item) =>
			EXACT_VERSION_REGEX.test(item.version),
		)
			? selectedPackages.value
					.map((item) =>
						item.version.replace(INVALID_NAME_REGEX, "-"),
					)
					.join("-")
			: "1.0.0",
	};
});

const methodLabel = computed(() =>
	bundleMethod.value === "slim-bundle" ? "Slim bundle" : "Full bundle",
);

const packageJsonExport = computed(() =>
	JSON.stringify(
		{
			name: `packy-${sanitizePackageName(
				bundleName.value || bundleDefaults.value.name || "bundle",
			)}`,
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

watch(
	[bundleDefaults, isSingleSlim],
	([{ name, version }]) => {
		if (isSingleSlim.value) {
			bundleName.value = selectedPackages.value[0]?.name ?? name;
			bundleVersion.value = selectedPackages.value[0]?.version ?? version;
			return;
		}

		if (!bundleNameTouched.value) {
			bundleName.value = name;
		}

		if (!bundleVersionTouched.value) {
			bundleVersion.value = version;
		}
	},
	{ immediate: true },
);

watch([bundleMethod, isSingleSlim], ([method], [previousMethod]) => {
	bundleNameError.value = "";
	bundleVersionError.value = "";

	if (
		previousMethod === "slim-bundle" &&
		method === "full-bundle" &&
		!EXACT_VERSION_REGEX.test(bundleVersion.value.trim())
	) {
		bundleVersion.value = bundleDefaults.value.version;
		bundleVersionTouched.value = false;
	}
});

watch(searchTerm, (term) => {
	if (term.trim()) {
		return;
	}

	searchRequestId += 1;
	searchResults.value = [];
	searchError.value = "";
	searchRetryTerm.value = "";
	searchAnnouncement.value = "";
	hasSearched.value = false;
	searchLoading.value = false;
});

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

function packageData(packument: RegistryPackument) {
	const rawVersions = Object.entries(packument.versions ?? {});
	const latest =
		packument["dist-tags"]?.latest ?? rawVersions.at(-1)?.[0] ?? "latest";
	const versions: PackageVersion[] = rawVersions
		.toSorted(([left], [right]) => compareVersionsDesc(left, right))
		.map(([version, meta]) => ({
			value: version,
			label: version,
			latest: version === latest,
			deprecated: meta.deprecated,
			sizeBytes: meta.dist?.unpackedSize,
		}));

	return {
		latest,
		description: packument.description ?? "",
		versions:
			versions.length > 0
				? versions
				: [{ value: latest, label: latest, latest: true }],
	};
}

function toSearchResult(packument: RegistryPackument): SearchResult {
	const data = packageData(packument);
	const latestOption =
		data.versions.find((option) => option.value === data.latest) ??
		data.versions[0];

	return {
		name: packument.name,
		version: data.latest,
		latest: data.latest,
		versions: data.versions,
		description: data.description,
		sizeBytes: latestOption?.sizeBytes,
		versionCount: data.versions.length,
	};
}

function sanitizePackageName(name: string) {
	return (
		name.replace(INVALID_NAME_REGEX, "-").replace(EDGE_DASH_REGEX, "") ||
		"package"
	);
}

function getVersionOption(pkg: SelectedPackage, version: string) {
	return pkg.versions.find((option) => option.value === version);
}

function selectedVersionOption(pkg: SelectedPackage) {
	return getVersionOption(pkg, pkg.version);
}

function selectedSize(pkg: SelectedPackage) {
	return pkg.sizeBytes ?? selectedVersionOption(pkg)?.sizeBytes;
}

function isSelected(name: string) {
	return selectedPackages.value.some((pkg) => pkg.name === name);
}

function errorMessage(cause: unknown) {
	return cause instanceof Error ? cause.message : String(cause);
}

function registryErrorMessage(cause: unknown) {
	const message = errorMessage(cause);

	if (NETWORK_ERROR_REGEX.test(message)) {
		return "The npm registry could not be reached. Check your connection and try again.";
	}

	return message;
}

function isNotFoundError(cause: unknown) {
	if (cause && typeof cause === "object" && "statusCode" in cause) {
		return (cause as { statusCode?: number }).statusCode === 404;
	}

	return NOT_FOUND_REGEX.test(errorMessage(cause));
}

async function runSearch() {
	if (importing.value) {
		return;
	}

	const value = searchTerm.value.trim();

	if (!value) {
		searchRequestId += 1;
		searchResults.value = [];
		searchError.value = "";
		searchRetryTerm.value = "";
		searchAnnouncement.value = "";
		hasSearched.value = false;
		searchLoading.value = false;
		searchInput.value?.focus();
		return;
	}

	const requestId = ++searchRequestId;
	searchLoading.value = true;
	searchError.value = "";
	searchResults.value = [];
	searchAnnouncement.value = `Searching the npm registry for ${value}.`;
	hasSearched.value = false;
	searchRetryTerm.value = "";
	lastSearchTerm.value = value;

	try {
		let results: SearchResult[] = [];

		if (value.length < 3) {
			try {
				results = [toSearchResult(await getPackument(value))];
			} catch (cause) {
				if (!isNotFoundError(cause)) {
					throw cause;
				}

				results = [];
			}
		} else {
			const packuments = await searchRegistryPackages(value);
			results = packuments.map(toSearchResult);
		}

		if (requestId !== searchRequestId) {
			return;
		}

		searchResults.value = results;
		searchAnnouncement.value =
			results.length > 0
				? `${results.length} package${
						results.length === 1 ? "" : "s"
					} found for ${value}.`
				: `No packages found for ${value}.`;
		hasSearched.value = true;
	} catch (cause) {
		if (requestId !== searchRequestId) {
			return;
		}

		searchError.value = registryErrorMessage(cause);
		searchRetryTerm.value = value;
		searchAnnouncement.value = "";
	} finally {
		if (requestId === searchRequestId) {
			searchLoading.value = false;
		}
	}
}

async function addPackage(result: SearchResult) {
	if (isSelected(result.name) || importing.value) {
		return;
	}

	selectedPackages.value = [
		...selectedPackages.value,
		{
			name: result.name,
			version: result.latest,
			versions: result.versions,
			description: result.description,
			sizeBytes: result.sizeBytes,
		},
	];
	selectionAnnouncement.value = `Added ${result.name} to the selected packages.`;

	await nextTick();
	const target = [
		...(packageSection.value?.querySelectorAll<HTMLSelectElement>(
			".version-select",
		) ?? []),
	].find((select) => select.dataset.packageName === result.name);
	target?.focus();
}

async function addByName(name: string) {
	if (isSelected(name) || addingPackage.value || importing.value) {
		return;
	}

	addingPackage.value = name;
	searchError.value = "";
	searchRetryTerm.value = "";

	try {
		await addPackage(toSearchResult(await getPackument(name)));
	} catch (cause) {
		searchError.value = `Could not load ${name}: ${registryErrorMessage(cause)}`;
	} finally {
		addingPackage.value = "";
	}
}

async function removePackage(name: string) {
	const index = selectedPackages.value.findIndex((pkg) => pkg.name === name);

	if (index === -1) {
		return;
	}

	selectedPackages.value = selectedPackages.value.filter(
		(pkg) => pkg.name !== name,
	);
	selectionAnnouncement.value = `Removed ${name} from the selected packages.`;

	await nextTick();
	const selects = [
		...(packageSection.value?.querySelectorAll<HTMLSelectElement>(
			".version-select",
		) ?? []),
	];
	const target =
		selects[Math.min(index, selects.length - 1)] ?? searchInput.value;
	target?.focus();
}

function updateSelectedPackageVersion(name: string, version: string) {
	selectedPackages.value = selectedPackages.value.map((pkg) =>
		pkg.name === name
			? {
					...pkg,
					version,
					sizeBytes: getVersionOption(pkg, version)?.sizeBytes,
				}
			: pkg,
	);
}

function handleVersionChange(name: string, event: Event) {
	const select = event.target as HTMLSelectElement;
	updateSelectedPackageVersion(name, select.value);
}

async function importPackageJsonText(text: string, requestId: number) {
	let manifest: {
		name?: string;
		version?: string;
		dependencies?: Record<string, string>;
	};

	try {
		manifest = JSON.parse(text) as typeof manifest;
	} catch {
		throw new Error("The file is not valid JSON.");
	}

	const dependencies = Object.entries(manifest.dependencies ?? {});

	if (!dependencies.length) {
		throw new Error("The package.json does not contain any dependencies.");
	}

	const importedName = manifest.name ?? bundleName.value;
	const importedVersion = manifest.version ?? bundleVersion.value;

	const settled = await Promise.allSettled(
		dependencies.map(async ([name, version]) => {
			const data = packageData(await getPackument(name));
			const exact = data.versions.find(
				(option) => option.value === version,
			);
			const versions = exact
				? data.versions
				: [
						{
							value: version,
							label: `${version} (range)`,
						},
						...data.versions,
					];

			return {
				name,
				version,
				versions,
				description: data.description,
				sizeBytes: exact?.sizeBytes,
			} satisfies SelectedPackage;
		}),
	);

	const imported: SelectedPackage[] = [];
	const failed: string[] = [];

	settled.forEach((result, index) => {
		if (result.status === "fulfilled") {
			imported.push(result.value);
		} else {
			failed.push(dependencies[index][0]);
		}
	});

	if (requestId !== importRequestId) {
		return;
	}

	if (!imported.length) {
		throw new Error(
			`Could not load any of the listed packages: ${failed.join(", ")}.`,
		);
	}

	bundleName.value = importedName;
	bundleVersion.value = importedVersion;
	bundleNameTouched.value = true;
	bundleVersionTouched.value = true;
	bundleNameError.value = "";
	bundleVersionError.value = "";
	selectedPackages.value = imported;
	searchRequestId += 1;
	searchLoading.value = false;
	searchError.value = "";
	searchRetryTerm.value = "";
	searchAnnouncement.value = "";
	searchTerm.value = "";
	lastSearchTerm.value = "";
	searchResults.value = [];
	hasSearched.value = false;

	const exactRequired =
		imported.length === 1 &&
		bundleMethod.value === "slim-bundle" &&
		!EXACT_VERSION_REGEX.test(imported[0]?.version ?? "");
	selectionAnnouncement.value = `Imported ${imported.length} package${
		imported.length === 1 ? "" : "s"
	}.${exactRequired ? " Choose an exact version to start bundling." : ""}`;

	if (failed.length) {
		importWarning.value = `Imported ${imported.length} package(s). Could not load ${failed.join(", ")}.`;
	}
}

function openPackageJsonFile() {
	if (!importing.value && !addingPackage.value) {
		packageJsonFileInput.value?.click();
	}
}

async function handlePackageJsonFileChange(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) {
		return;
	}

	if (addingPackage.value) {
		input.value = "";
		return;
	}

	const requestId = ++importRequestId;
	importing.value = true;
	importError.value = "";
	importWarning.value = "";

	try {
		await importPackageJsonText(await file.text(), requestId);
	} catch (cause) {
		if (requestId === importRequestId) {
			importError.value = `Import failed. ${errorMessage(cause)}`;
		}
	} finally {
		if (requestId === importRequestId) {
			importing.value = false;
		}
		input.value = "";
	}
}

function exportPackageJson() {
	if (importing.value || addingPackage.value) {
		return;
	}

	if (!validateBundleFields()) {
		return;
	}

	const blob = new Blob([`${packageJsonExport.value}\n`], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${sanitizePackageName(
		bundleName.value || bundleDefaults.value.name || "packy-bundle",
	)}.package.json`;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function goNext() {
	if (!canBundle.value) {
		return;
	}

	if (!validateBundleFields()) {
		return;
	}

	const singlePackage = isSingleSlim.value
		? selectedPackages.value[0]
		: undefined;

	emit("advance", {
		packages: selectedPackages.value.map(({ name, version }) => ({
			name,
			version,
		})),
		bundleName:
			singlePackage?.name ||
			bundleName.value ||
			bundleDefaults.value.name,
		bundleVersion:
			singlePackage?.version ||
			bundleVersion.value ||
			bundleDefaults.value.version,
		bundleMethod: bundleMethod.value,
	});
}

function bundleNameValidation() {
	if (isSingleSlim.value) {
		return "";
	}

	const name = bundleName.value.trim();

	if (!name) {
		return "Enter a bundle name.";
	}

	if (!PACKAGE_NAME_REGEX.test(name)) {
		return "Use a lowercase npm name: letters, numbers, dots, hyphens, underscores, or one @scope/.";
	}

	return "";
}

function bundleVersionValidation() {
	if (isSingleSlim.value) {
		return "";
	}

	const version = bundleVersion.value.trim();

	if (!version) {
		return "Enter a bundle version.";
	}

	if (!EXACT_VERSION_REGEX.test(version)) {
		return "Use a semantic version, for example 1.0.0.";
	}

	return "";
}

function validateBundleFields() {
	const nameValid = bundleNameInput.value?.checkValidity() ?? true;
	const versionValid = bundleVersionInput.value?.checkValidity() ?? true;

	bundleNameError.value = nameValid ? "" : bundleNameValidation();
	bundleVersionError.value = versionValid ? "" : bundleVersionValidation();

	if (bundleNameError.value) {
		bundleNameInput.value?.focus();
		return false;
	}

	if (bundleVersionError.value) {
		bundleVersionInput.value?.focus();
		return false;
	}

	bundleName.value = bundleName.value.trim();
	bundleVersion.value = bundleVersion.value.trim();
	return true;
}

function handleBundleNameInput() {
	bundleNameTouched.value = true;
	bundleNameError.value = "";
}

function handleBundleVersionInput() {
	bundleVersionTouched.value = true;
	bundleVersionError.value = "";
}

function handleBundleNameBlur() {
	if (bundleNameTouched.value) {
		bundleNameError.value = bundleNameValidation();
	}
}

function handleBundleVersionBlur() {
	if (bundleVersionTouched.value) {
		bundleVersionError.value = bundleVersionValidation();
	}
}

function retrySearch() {
	searchTerm.value = searchRetryTerm.value;
	void runSearch();
	void nextTick().then(() => searchInput.value?.focus());
}

function handleShortcut(event: KeyboardEvent) {
	if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
		event.preventDefault();
		goNext();
	}
}

onMounted(() => {
	window.addEventListener("keydown", handleShortcut);
});

onBeforeUnmount(() => {
	window.removeEventListener("keydown", handleShortcut);
});
</script>

<template>
	<div class="t128n-stack">
		<div
			v-if="!isolationAvailable"
			class="notice notice--error"
			role="alert"
		>
			<p>
				<strong>Bundling is unavailable.</strong> WebContainers need
				cross-origin isolation. Serve packy with COOP and COEP headers,
				then reload.
			</p>
			<p>You can still prepare the selection.</p>
		</div>
		<div
			v-else-if="runtimeError"
			class="notice notice--warning"
			role="status"
		>
			<p><strong>Runtime error.</strong> {{ runtimeError }}</p>
			<p>
				Starting a bundle retries the in-browser runtime. Reload the
				page if it keeps failing.
			</p>
		</div>

		<section class="settings" aria-labelledby="settings-title">
			<div class="section-heading">
				<h2 id="settings-title" class="headline-md">Bundle settings</h2>
				<p>
					Both fields are required for full bundles. Slim bundles
					derive them from the package.
				</p>
			</div>

			<p
				v-if="bundleErrorCount"
				id="settings-error-summary"
				class="field-error"
				role="alert"
			>
				{{ bundleErrorCount }}
				{{
					bundleErrorCount === 1
						? "field needs attention."
						: "fields need attention."
				}}
			</p>

			<form
				id="bundle-settings"
				class="t128n-form-grid"
				novalidate
				@submit.prevent="goNext"
			>
				<div class="field">
					<label for="bundle-name">Bundle name</label>
					<input
						id="bundle-name"
						ref="bundleNameInput"
						v-model="bundleName"
						class="input"
						type="text"
						placeholder="my-bundle"
						autocomplete="off"
						:required="!isSingleSlim"
						:pattern="
							isSingleSlim
								? undefined
								: '(@[a-z0-9._\\-]+/)?[a-z0-9._\\-]+'
						"
						:readonly="isSingleSlim"
						:aria-invalid="Boolean(bundleNameError)"
						:aria-describedby="
							bundleNameError
								? 'settings-error-summary bundle-name-help bundle-name-error'
								: 'bundle-name-help'
						"
						@input="handleBundleNameInput"
						@blur="handleBundleNameBlur"
					/>
					<p id="bundle-name-help" class="hint">
						{{
							isSingleSlim
								? "Slim single-package bundles use the package name."
								: "Used for the tarball and the generated package.json."
						}}
					</p>
					<p
						v-if="bundleNameError"
						id="bundle-name-error"
						class="field-error"
					>
						{{ bundleNameError }}
					</p>
				</div>

				<div class="field">
					<label for="bundle-version">Bundle version</label>
					<input
						id="bundle-version"
						ref="bundleVersionInput"
						v-model="bundleVersion"
						class="input"
						type="text"
						placeholder="1.0.0"
						autocomplete="off"
						:required="!isSingleSlim"
						:pattern="
							isSingleSlim
								? undefined
								: '[0-9]+\\.[0-9]+\\.[0-9]+([\\-+][0-9A-Za-z.\\-]+)?'
						"
						:readonly="isSingleSlim"
						:aria-invalid="Boolean(bundleVersionError)"
						:aria-describedby="
							bundleVersionError
								? 'settings-error-summary bundle-version-help bundle-version-error'
								: 'bundle-version-help'
						"
						@input="handleBundleVersionInput"
						@blur="handleBundleVersionBlur"
					/>
					<p id="bundle-version-help" class="hint">
						{{
							isSingleSlim
								? "Slim single-package bundles use the package name and exact version."
								: "Used for the tarball and the generated package.json."
						}}
					</p>
					<p
						v-if="bundleVersionError"
						id="bundle-version-error"
						class="field-error"
					>
						{{ bundleVersionError }}
					</p>
				</div>

				<fieldset class="fieldset t128n-form-grid__wide">
					<legend>Bundling method</legend>

					<label class="choice">
						<input
							v-model="bundleMethod"
							type="radio"
							name="bundle-method"
							value="slim-bundle"
						/>
						<span class="choice__text">
							<span class="choice__title"
								>Slim bundle (default)</span
							>
							<span class="hint">
								{{
									selectedPackages.length === 1
										? `Packs ${selectedPackages[0]?.name} directly with its dependencies.`
										: "Packs all packages into a portable bundle."
								}}
							</span>
						</span>
					</label>

					<label class="choice">
						<input
							v-model="bundleMethod"
							type="radio"
							name="bundle-method"
							value="full-bundle"
						/>
						<span class="choice__text">
							<span class="choice__title">Full bundle</span>
							<span class="hint"
								>Always wraps packages in a new bundle
								container.</span
							>
						</span>
					</label>
				</fieldset>
			</form>
		</section>

		<section
			ref="packageSection"
			class="t128n-register"
			aria-labelledby="selected-title"
		>
			<header class="t128n-register__header">
				<div class="section-heading">
					<h2 id="selected-title" class="headline-md">
						Selected packages
					</h2>
				</div>
				<p class="hint">
					Choose exact versions here. Package names and versions are
					written to the bundle manifest.
				</p>
				<p class="sr-only" role="status" aria-live="polite">
					{{ selectionAnnouncement }}
				</p>
			</header>

			<div class="t128n-register__toolbar">
				<div class="toolbar">
					<p class="hint" role="status" aria-live="polite">
						{{
							importing
								? "Importing package.json…"
								: "Search the npm registry, or import an existing package.json."
						}}
					</p>
					<div class="toolbar__group">
						<button
							class="button button--secondary"
							type="button"
							:aria-disabled="
								importing || addingPackage !== ''
									? 'true'
									: undefined
							"
							@title="
								addingPackage
									? 'Wait for the package to finish loading'
									: undefined
							"
							@click="openPackageJsonFile"
						>
							{{
								importing ? "Importing…" : "Import package.json"
							}}
						</button>
						<button
							class="button button--secondary"
							type="button"
							:disabled="
								!selectedPackages.length ||
								importing ||
								addingPackage !== '' ||
								slimVersionNeedsExact
							"
							:title="
								!selectedPackages.length
									? 'Select at least one package to export'
									: importing
										? 'Wait for the package.json import to finish'
										: addingPackage
											? 'Wait for the package to finish loading'
											: slimVersionNeedsExact
												? 'Choose an exact version before exporting'
												: 'Download a package.json for this bundle'
							"
							@click="exportPackageJson"
						>
							Export package.json
						</button>
						<input
							ref="packageJsonFileInput"
							type="file"
							accept="application/json,.json"
							class="sr-only"
							tabindex="-1"
							aria-hidden="true"
							@change="handlePackageJsonFileChange"
						/>
					</div>
				</div>

				<div class="search-panel">
					<form class="search-row" @submit.prevent="runSearch">
						<div class="field">
							<label for="package-search"
								>Search npm packages</label
							>
							<input
								id="package-search"
								ref="searchInput"
								v-model="searchTerm"
								class="input"
								type="search"
								placeholder="e.g. zod"
								autocomplete="off"
							/>
						</div>
						<button
							class="button button--secondary"
							type="submit"
							:aria-disabled="importing ? 'true' : undefined"
						>
							Search
						</button>
					</form>

					<div
						class="suggestions"
						role="group"
						aria-label="Popular packages"
					>
						<span class="suggestions__label">Popular</span>
						<button
							v-for="name in popularPackages"
							:key="name"
							class="button button--secondary"
							type="button"
							:aria-disabled="
								isSelected(name) ||
								addingPackage !== '' ||
								importing
									? 'true'
									: undefined
							"
							@click="addByName(name)"
						>
							{{ name
							}}<span v-if="isSelected(name)" class="sr-only">
								(already selected)</span
							>
						</button>
					</div>

					<p
						v-if="addingPackage"
						class="hint"
						role="status"
						aria-live="polite"
					>
						Loading {{ addingPackage }} from the npm registry…
					</p>

					<p class="sr-only" role="status" aria-live="polite">
						{{ searchAnnouncement }}
					</p>
					<div v-if="searchLoading" class="empty-state">
						Searching the npm registry…
					</div>
					<div
						v-else-if="hasSearched && !searchResults.length"
						class="empty-state"
					>
						No packages found for “{{ lastSearchTerm }}”. Try
						another name.
					</div>
					<ul
						v-else-if="searchResults.length"
						class="result-list"
						aria-label="Search results"
					>
						<li
							v-for="result in searchResults"
							:key="result.name"
							class="result"
						>
							<div class="result__main">
								<div class="result__title">
									<span class="result__name">{{
										result.name
									}}</span>
									<span class="result__meta"
										>latest {{ result.latest }}</span
									>
								</div>
								<p
									v-if="result.description"
									class="result__description"
								>
									{{ result.description }}
								</p>
								<p class="result__meta">
									{{ result.versionCount }} versions &middot;
									{{ formatBytes(result.sizeBytes) }}
								</p>
							</div>
							<span
								v-if="isSelected(result.name)"
								class="status status--success"
								>Added</span
							>
							<button
								v-else
								class="button button--secondary"
								type="button"
								:disabled="addingPackage !== '' || importing"
								:aria-label="`Add ${result.name} at ${result.latest}`"
								@click="addPackage(result)"
							>
								Add
							</button>
						</li>
					</ul>

					<div
						v-if="searchError"
						class="notice notice--error"
						role="alert"
					>
						<p>
							<strong>npm registry request failed.</strong>
							{{ searchError }} Try again or import a
							package.json.
						</p>
					</div>
					<button
						v-if="searchError && searchRetryTerm"
						class="button button--secondary"
						type="button"
						@click="retrySearch"
					>
						Retry search
					</button>

					<div
						v-if="importWarning"
						class="notice notice--warning"
						role="status"
					>
						<p>
							<span class="status status--warning"
								>Partial import</span
							>
						</p>
						<p>{{ importWarning }}</p>
					</div>

					<div
						v-if="importError"
						class="notice notice--error"
						role="alert"
					>
						<p>{{ importError }}</p>
					</div>
				</div>
			</div>

			<div class="t128n-register__body">
				<div
					v-if="!selectedPackages.length"
					class="empty-state"
					role="status"
				>
					No packages selected. Search for a package above or import a
					package.json.
				</div>
				<div
					v-else
					class="t128n-table-scroll t128n-table-scroll--pin-first table-wrap"
					tabindex="0"
					role="region"
					aria-label="Selected packages table"
				>
					<table>
						<caption class="sr-only">
							Selected packages, with version, unpacked size,
							links, and row actions
						</caption>
						<thead>
							<tr>
								<th scope="col">Package</th>
								<th scope="col">Version</th>
								<th scope="col" class="numeric">
									Unpacked size
								</th>
								<th scope="col">Links</th>
								<th scope="col">
									<span class="sr-only">Actions</span>
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="pkg in selectedPackages" :key="pkg.name">
								<th scope="row">
									<div class="package-cell">
										<span class="package-name">{{
											pkg.name
										}}</span>
										<span
											v-if="pkg.description"
											class="package-description"
											>{{ pkg.description }}</span
										>
									</div>
								</th>
								<td>
									<div class="cell-stack">
										<select
											class="select version-select"
											:value="pkg.version"
											:data-package-name="pkg.name"
											:disabled="importing"
											:aria-label="`Version for ${pkg.name}`"
											@change="
												handleVersionChange(
													pkg.name,
													$event,
												)
											"
										>
											<option
												v-for="option in pkg.versions"
												:key="option.value"
												:value="option.value"
											>
												{{ option.label
												}}{{
													option.latest
														? " (latest)"
														: ""
												}}{{
													option.deprecated
														? " (deprecated)"
														: ""
												}}
											</option>
										</select>
										<span
											v-if="
												selectedVersionOption(pkg)
													?.deprecated
											"
											class="status status--warning"
											:title="
												selectedVersionOption(pkg)
													?.deprecated
											"
											>Deprecated</span
										>
										<span
											v-if="slimVersionNeedsExact"
											class="status status--warning"
											title="Slim single-package bundles need an exact version. Choose one from the version list."
											>Choose exact</span
										>
									</div>
								</td>
								<td class="numeric">
									{{ formatBytes(selectedSize(pkg)) }}
								</td>
								<td>
									<details class="row-details">
										<summary
											:aria-label="`Links for ${pkg.name}`"
										>
											Links
										</summary>
										<ul>
											<li>
												<a
													:href="`https://npmx.dev/package/${encodeURIComponent(pkg.name)}/v/${encodeURIComponent(pkg.version)}`"
													target="_blank"
													rel="noreferrer"
													:aria-label="`View on npmx: ${pkg.name} ${pkg.version}`"
													>View on npmx</a
												>
											</li>
											<li>
												<a
													:href="`https://node-modules.dev/graph#install=${encodeURIComponent(pkg.name)}@${encodeURIComponent(pkg.version)}`"
													target="_blank"
													rel="noreferrer"
													:aria-label="`View dependency graph: ${pkg.name} ${pkg.version}`"
													>View dependency graph</a
												>
											</li>
											<li>
												<a
													:href="`https://pkg-size.dev/${encodeURIComponent(pkg.name)}@${encodeURIComponent(pkg.version)}`"
													target="_blank"
													rel="noreferrer"
													:aria-label="`View bundle size: ${pkg.name} ${pkg.version}`"
													>View bundle size</a
												>
											</li>
										</ul>
									</details>
								</td>
								<td>
									<div class="cell-actions">
										<button
											class="button button--secondary"
											type="button"
											:disabled="importing"
											:aria-label="`Remove ${pkg.name}`"
											@click="removePackage(pkg.name)"
										>
											Remove
										</button>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<footer class="t128n-register__footer">
				<div class="toolbar">
					<p class="hint">
						{{ selectedPackages.length }}
						{{
							selectedPackages.length === 1
								? "package"
								: "packages"
						}}
						&middot; {{ methodLabel }}
						<template v-if="canBundle">
							&middot; <kbd>Ctrl</kbd>/<kbd>⌘</kbd> +
							<kbd>Enter</kbd> starts bundling.
						</template>
					</p>
					<div class="toolbar__group">
						<p v-if="!isolationAvailable" class="hint">
							Bundling needs cross-origin isolation.
						</p>
						<p v-else-if="slimVersionNeedsExact" class="hint">
							Choose an exact version for the single package.
						</p>
						<button
							class="button button--primary"
							type="submit"
							form="bundle-settings"
							:disabled="!canBundle"
							:title="
								!canAdvance
									? 'Select at least one package'
									: !isolationAvailable
										? 'WebContainers need cross-origin isolation'
										: slimVersionNeedsExact
											? 'Choose an exact version for the single package'
											: importing
												? 'Wait for the package.json import to finish'
												: addingPackage
													? 'Wait for the package to finish loading'
													: undefined
							"
						>
							Start bundling
						</button>
					</div>
				</div>
			</footer>
		</section>
	</div>
</template>
