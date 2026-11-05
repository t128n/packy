<script lang="ts">
	import { Button, Input, Spinner } from "sveltestrap";
	import { valid, validRange, maxSatisfying } from "semver";
	import { tick } from "svelte";

	import {
		compareVersionsDesc,
		getPackument,
		RegistryError,
		searchPackages,
		type RegistryPackument,
		type RegistrySearchResult,
		type RegistryVersion,
	} from "~/lib/npm-registry";

	type Props = {
		disabled?: boolean;
		disabledReason?: string;
		onStart: (reference: { name: string; versionSpec: string }) => void;
	};

	let {
		disabled = false,
		disabledReason = "Wait for the current run to finish.",
		onStart,
	}: Props = $props();

	const POPULAR_PACKAGES = [
		"react",
		"vue",
		"vite",
		"typescript",
		"zod",
		"lodash",
	] as const;
	const MAX_VISIBLE_VERSIONS = 300;
	const SEARCH_DEBOUNCE_MS = 300;
	const SEARCH_MIN_LENGTH = 3;
	const FORBIDDEN_SPEC =
		/^(?:file:|link:|workspace:|git\+|https?:|npm:)|[/\\]|^\./i;
	const NEWLINE = /[\r\n]/;
	const WHITESPACE = /\s/;

	let searchTerm = $state("");
	let searchResults = $state<RegistrySearchResult[]>([]);
	let searchLoading = $state(false);
	let searchError = $state("");
	let searchAttempted = $state(false);

	let packument = $state<RegistryPackument | null>(null);
	let packageName = $state("");
	let packageLoading = $state(false);
	let packageError = $state("");
	let pendingPackage = $state("");

	let versionSpec = $state("latest");
	let customMode = $state(false);
	let customSpec = $state("");

	let searchRequestId = 0;
	let loadRequestId = 0;

	let searchField = $state<HTMLInputElement>();
	let versionField = $state<HTMLSelectElement>();
	let customField = $state<HTMLInputElement>();
	let resultsList = $state<HTMLElement>();

	const packumentCache = new Map<string, RegistryPackument>();

	$effect(() => {
		const term = searchTerm.trim();
		const requestId = ++searchRequestId;

		searchError = "";
		searchAttempted = false;

		if (term.length === 0 || packument || packageLoading) {
			searchResults = [];
			searchLoading = false;
			return;
		}

		searchResults = [];
		searchLoading = true;

		const timer = setTimeout(() => {
			void performSearch(term, requestId);
		}, SEARCH_DEBOUNCE_MS);

		return () => {
			clearTimeout(timer);
		};
	});

	let sortedVersions = $derived.by(
		(): Array<[string, RegistryVersion]> => {
			if (!packument) {
				return [];
			}

			return Object.entries(packument.versions).toSorted(
				([left], [right]) => compareVersionsDesc(left, right),
			);
		},
	);

	let latestVersion = $derived(
		packument?.["dist-tags"].latest ?? sortedVersions[0]?.[0] ?? "",
	);
	let capped = $derived(sortedVersions.length > MAX_VISIBLE_VERSIONS);

	let tagOptions = $derived.by(() => {
		const currentPackument = packument;

		if (!currentPackument) {
			return [];
		}

		return Object.entries(currentPackument["dist-tags"])
			.filter(
				([tag]) => !Object.hasOwn(currentPackument.versions, tag),
			)
			.toSorted(([left], [right]) => {
				if (left === "latest") {
					return -1;
				}

				if (right === "latest") {
					return 1;
				}

				return left.localeCompare(right);
			})
			.map(([tag, version]) => ({ value: tag, label: tag, version }));
	});

	let searchEmptyMessage = $derived.by(() => {
		if (
			searchLoading ||
			searchError ||
			!searchAttempted ||
			searchResults.length > 0
		) {
			return "";
		}

		const term = searchTerm.trim();

		if (term.length === 0) {
			return "";
		}

		if (term.length < SEARCH_MIN_LENGTH) {
			return `No package is named "${term}". Type at least 3 characters to search npm.`;
		}

		return `No packages found for "${term}". Check the spelling and try again.`;
	});

	let effectiveVersionSpec = $derived(
		customMode ? customSpec.trim() : versionSpec,
	);

	let customSpecError = $derived.by(() => {
		if (!customMode) {
			return "";
		}

		const value = customSpec.trim();

		if (!value) {
			return "Enter an exact version, a semver range, or a dist-tag.";
		}

		if (value.length > 128) {
			return "Version specs must be 128 characters or fewer.";
		}

		if (FORBIDDEN_SPEC.test(value)) {
			return "Use a registry version, range, or tag. File, git, URL, and local path specs are not supported.";
		}

		if (NEWLINE.test(value)) {
			return "Version specs must be a single line.";
		}

		if (packument && valid(value) && !Object.hasOwn(packument.versions, value)) {
			return `Version ${value} is not published. Choose a published version or range.`;
		}
		if (packument && !validRange(value) && !Object.hasOwn(packument["dist-tags"], value)) {
			return `“${value}” is not a valid range or a published tag.`;
		}
		if (packument && validRange(value) && !maxSatisfying(Object.keys(packument.versions), value)) {
			return `No published version matches ${value}. Try another range.`;
		}
		return "";
	});

	let resolvedVersion = $derived.by(() => {
		if (!packument || !effectiveVersionSpec) {
			return "";
		}

		if (Object.hasOwn(packument.versions, effectiveVersionSpec)) {
			return effectiveVersionSpec;
		}

		const tagged = packument["dist-tags"][effectiveVersionSpec];

		return tagged && Object.hasOwn(packument.versions, tagged)
			? tagged
			: "";
	});

	let resolvedMeta = $derived(
		resolvedVersion ? packument?.versions[resolvedVersion] : undefined,
	);
	let selectedSize = $derived(resolvedMeta?.dist?.unpackedSize);
	let isDeprecated = $derived(Boolean(resolvedMeta?.deprecated));

	let canStart = $derived(
		Boolean(packageName) &&
			Boolean(packument) &&
			!packageLoading &&
			!disabled &&
			effectiveVersionSpec.length > 0 &&
			customSpecError.length === 0,
	);

	async function performSearch(term: string, requestId: number) {
		try {
			let results: RegistrySearchResult[];

			if (term.length < SEARCH_MIN_LENGTH) {
				const exact = await findExactPackument(term);
				results = exact ? [toSearchResult(exact)] : [];
			} else {
				results = await searchPackages(term);

				if (results.length === 0) {
					const exact = await findExactPackument(term).catch(
						() => null,
					);
					results = exact ? [toSearchResult(exact)] : [];
				}
			}

			if (requestId !== searchRequestId) {
				return;
			}

			searchResults = results;
		} catch (error) {
			if (requestId !== searchRequestId) {
				return;
			}

			searchResults = [];
			searchError = describeSearchError(term, error);
		} finally {
			if (requestId === searchRequestId) {
				searchLoading = false;
				searchAttempted = true;
			}
		}
	}

	async function findExactPackument(
		term: string,
	): Promise<RegistryPackument | null> {
		try {
			return await loadPackument(term);
		} catch (error) {
			if (error instanceof RegistryError && error.kind === "not-found") {
				return null;
			}

			throw error;
		}
	}

	async function loadPackument(name: string): Promise<RegistryPackument> {
		const cached = packumentCache.get(name);

		if (cached) {
			return cached;
		}

		const data = await getPackument(name);
		packumentCache.set(name, data);

		return data;
	}

	function toSearchResult(
		packumentResult: RegistryPackument,
	): RegistrySearchResult {
		return {
			name: packumentResult.name,
			version: packumentResult["dist-tags"].latest,
			description: packumentResult.description,
		};
	}

	async function loadPackage(name: string) {
		const trimmed = name.trim();

		if (!trimmed) {
			return;
		}

		const requestId = ++loadRequestId;

		pendingPackage = trimmed;
		packageLoading = true;
		packageError = "";
		searchError = "";
		searchLoading = false;
		searchResults = [];
		searchRequestId += 1;

		try {
			const data = await loadPackument(trimmed);

			if (requestId !== loadRequestId) {
				return;
			}

			packument = data;
			packageName = data.name;
			versionSpec = "latest";
			customMode = false;
			customSpec = "";
			searchTerm = "";
			packageLoading = false;
			await tick();
			versionField?.focus();
		} catch (error) {
			if (requestId !== loadRequestId) {
				return;
			}

			packument = null;
			packageName = "";
			packageError = describeLoadError(trimmed, error);
		} finally {
			if (requestId === loadRequestId) {
				packageLoading = false;
			}
		}
	}

	function selectPackageValue(value: string) {
		if (!value || disabled) {
			return;
		}

		searchTerm = "";
		void loadPackage(value);
	}

	function selectPopular(name: string) {
		if (disabled) {
			return;
		}

		searchTerm = "";
		void loadPackage(name);
	}

	function handleSearchInput(event: Event) {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
	}

	function handleVersionChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;

		if (value) {
			versionSpec = value;
		}
	}

	function handleCustomSpecInput(event: Event) {
		customSpec = (event.currentTarget as HTMLInputElement).value;
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === "ArrowDown" && searchResults.length > 0) {
			event.preventDefault();
			resultsList
				?.querySelector<HTMLButtonElement>("button[data-result]")
				?.focus();
			return;
		}

		if (event.key === "Enter") {
			event.preventDefault();

			const term = searchTerm.trim();

			if (searchResults.length > 0) {
				selectPackageValue(searchResults[0]?.name ?? "");
			} else if (term && !WHITESPACE.test(term)) {
				void loadPackage(term);
			}
			return;
		}

		if (event.key === "Escape") {
			searchTerm = "";
			searchResults = [];
		}
	}

	function handleResultKeydown(event: KeyboardEvent, index: number) {
		const buttons =
			resultsList?.querySelectorAll<HTMLButtonElement>("button[data-result]");

		if (!buttons || buttons.length === 0) {
			return;
		}

		if (event.key === "ArrowDown") {
			event.preventDefault();
			buttons[Math.min(index + 1, buttons.length - 1)]?.focus();
			return;
		}

		if (event.key === "ArrowUp") {
			event.preventDefault();

			if (index === 0) {
				searchField?.focus();
			} else {
				buttons[index - 1]?.focus();
			}
			return;
		}

		if (event.key === "Escape") {
			event.preventDefault();
			searchField?.focus();
		}
	}

	async function useCustomSpec() {
		customMode = true;
		customSpec = versionSpec;
		await tick();
		customField?.focus();
	}

	async function usePublishedVersions() {
		customMode = false;
		customSpec = "";
		versionSpec = "latest";
		await tick();
		versionField?.focus();
	}

	function retrySearch() {
		const term = searchTerm.trim();

		if (!term) {
			return;
		}

		const requestId = ++searchRequestId;

		searchError = "";
		searchLoading = true;
		searchAttempted = false;
		searchResults = [];
		void performSearch(term, requestId);
	}

	function retryLoad() {
		if (pendingPackage) {
			void loadPackage(pendingPackage);
		}
	}

	async function clearSelection() {
		loadRequestId += 1;
		packument = null;
		packageName = "";
		packageLoading = false;
		packageError = "";
		pendingPackage = "";
		versionSpec = "latest";
		customMode = false;
		customSpec = "";
		searchTerm = "";
		searchResults = [];
		searchError = "";
		searchLoading = false;
		searchAttempted = false;
		await tick();
		searchField?.focus();
	}

	function start() {
		if (!canStart || !packageName) {
			return;
		}

		onStart({ name: packageName, versionSpec: effectiveVersionSpec });
	}

	function describeVersion(
		version: string,
		meta: RegistryVersion,
	): string {
		const parts: string[] = [];

		if (version === latestVersion) {
			parts.push("latest");
		}

		if (meta.deprecated) {
			parts.push("deprecated");
		}

		const size = meta.dist?.unpackedSize;

		if (size !== undefined) {
			parts.push(formatBytes(size));
		}

		return parts.join(" · ");
	}

	function describeSearchError(term: string, error: unknown): string {
		if (error instanceof RegistryError) {
			if (error.kind === "invalid-response") {
				return `npm returned an unexpected search response for "${term}". Try again in a moment.`;
			}

			if (error.kind === "network") {
				return `The npm registry could not be reached while searching for "${term}". Check your connection and try again.`;
			}
		}

		const detail = error instanceof Error ? error.message : String(error);

		return `Searching npm for "${term}" failed: ${detail}`;
	}

	function describeLoadError(name: string, error: unknown): string {
		if (error instanceof RegistryError) {
			if (error.kind === "not-found") {
				return `"${name}" was not found on the npm registry. Check the spelling or choose another package.`;
			}

			if (error.kind === "invalid-response") {
				return `npm returned an unexpected response for "${name}". Try again in a moment.`;
			}

			return `The npm registry could not be reached while loading "${name}". Check your connection and try again.`;
		}

		const detail = error instanceof Error ? error.message : String(error);

		return `Loading "${name}" failed: ${detail}`;
	}

	function truncate(value: string, maxLength: number): string {
		if (value.length <= maxLength) {
			return value;
		}

		return `${value.slice(0, maxLength - 1).trimEnd()}…`;
	}

	function formatBytes(bytes: number): string {
		const units = ["B", "KiB", "MiB", "GiB"];
		let value = bytes;
		let unit = 0;

		while (value >= 1024 && unit < units.length - 1) {
			value /= 1024;
			unit += 1;
		}

		return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
	}
</script>

{#if packageLoading}
	<div
		class="d-flex align-items-center gap-2 text-body-secondary"
		aria-live="polite"
	>
		<Spinner size="sm" />
		Loading {pendingPackage} from the npm registry…
	</div>
{:else if packageError}
	<div class="alert alert-danger" role="alert">
		<h4 class="alert-heading">Could not load package</h4>
		<p>{packageError}</p>
		<div class="d-flex flex-wrap gap-3">
			<Button color="link" class="p-0" on:click={retryLoad} {disabled}>
				Retry
			</Button>
			<Button color="link" class="p-0" on:click={clearSelection} {disabled}>
				Choose another package
			</Button>
		</div>
	</div>
{:else if packument}
	<div class="border rounded bg-body-tertiary p-3 mb-3">
		<div
			class="d-flex flex-wrap align-items-start justify-content-between gap-2"
		>
			<div>
				<h3 class="h5 mb-1">{packageName}</h3>
				{#if packument.description}
					<p class="text-body-secondary mb-0">{packument.description}</p>
				{/if}
			</div>
			<Button
				color="outline-secondary"
				size="sm"
				on:click={clearSelection}
				{disabled}>Change package</Button
			>
		</div>
		<p class="small text-body-secondary mt-3 mb-0">
			Requested: {effectiveVersionSpec}{#if resolvedVersion && resolvedVersion !== effectiveVersionSpec}{" · "}Currently points to {resolvedVersion}; npm resolves the tag when building.{:else if !resolvedVersion && effectiveVersionSpec}{" · "}npm resolves this when building.{/if}{#if selectedSize !== undefined}{" · "}{formatBytes(selectedSize)} unpacked{/if}
		</p>
	</div>

	{#if isDeprecated && resolvedMeta?.deprecated}
		<div class="alert alert-warning" role="alert">
			<h4 class="alert-heading">Deprecated version</h4>
			<p class="mb-0">{resolvedMeta.deprecated}</p>
		</div>
	{/if}

	{#if customMode}
		<div class="mb-3">
			<label class="form-label" for="custom-version">
				Version specification
			</label>
			<Input
				id="custom-version"
				value={customSpec}
				placeholder="^18.0.0 or next"
				invalid={Boolean(customSpecError)}
				feedback={customSpecError || undefined}
				on:input={handleCustomSpecInput}
				bind:inner={customField}
				{disabled}
			/>
			<div class="form-text">Exact version, semver range, or published tag.</div>
		</div>
	{:else}
		<div class="mb-3">
			<label class="form-label" for="version-select">Version</label>
			<Input
				id="version-select"
				type="select"
				value={versionSpec}
				on:change={handleVersionChange}
				bind:inner={versionField}
				{disabled}
			>
				<optgroup label="Dist-tags">
					{#each tagOptions as option (option.value)}
						<option value={option.value}>
							{option.label} → {option.version}
						</option>
					{/each}
				</optgroup>
				<optgroup label="Versions">
					{#each sortedVersions.slice(0, MAX_VISIBLE_VERSIONS) as [version, meta] (version)}
						{@const details = describeVersion(version, meta)}
						<option value={version}>
							{version}{details ? ` — ${details}` : ""}
						</option>
					{/each}
				</optgroup>
			</Input>
			{#if capped}
				<div class="form-text">
					Showing the {MAX_VISIBLE_VERSIONS} newest versions. Use a custom
					specification for older versions.
				</div>
			{/if}
		</div>
	{/if}

	<details class="mt-3">
		<summary class="text-body-secondary">Advanced options</summary>
		<div class="mt-3">
			{#if customMode}
				<p class="small text-body-secondary">
					Enter an exact version, a semver range, or a published dist-tag.
				</p>
				<Button
					color="link"
					class="p-0"
					on:click={usePublishedVersions}
					{disabled}>Browse published versions</Button
				>
			{:else}
				<p class="small text-body-secondary">
					Choose a published version above, or specify a range or tag.
				</p>
				<Button
					color="link"
					class="p-0"
					on:click={useCustomSpec}
					{disabled}>Use a version range or tag</Button
				>
			{/if}
		</div>
	</details>

	<div class="d-flex flex-wrap align-items-center gap-2 mt-3">
		<Button color="primary" disabled={!canStart} on:click={start}>
			Create bundle
		</Button>
		{#if disabled}
			<span class="small text-body-secondary">{disabledReason}</span>
		{/if}
	</div>

	<p class="small text-body-secondary mt-2 mb-0">
		Registry access is required to build. Packages requiring install scripts may
		need extra steps offline.
	</p>
{:else}
	<div class="mb-3">
		<label class="form-label" for="package-search">Package</label>
		<Input
			id="package-search"
			type="search"
			value={searchTerm}
			placeholder="Search npm packages…"
			autocomplete="off"
			spellcheck="false"
			aria-describedby="package-search-help"
			on:input={handleSearchInput}
			on:keydown={handleSearchKeydown}
			bind:inner={searchField}
			{disabled}
		/>
		<div id="package-search-help" class="form-text">
			Enter a package name, including scoped packages.
		</div>
	</div>

	{#if searchLoading}
		<div
			class="d-flex align-items-center gap-2 small text-body-secondary"
			aria-live="polite"
		>
			<Spinner size="sm" />
			Searching npm…
		</div>
	{:else if searchError}
		<div class="alert alert-danger" role="alert">
			<h4 class="alert-heading">Could not search npm</h4>
			<p>{searchError}</p>
			<Button color="link" class="p-0" on:click={retrySearch} {disabled}>
				Retry search
			</Button>
		</div>
	{:else if searchResults.length > 0}
		<div
			class="list-group app-result-list mb-3"
			bind:this={resultsList}
			aria-label="Package search results"
		>
			{#each searchResults as item, index (item.name)}
				<button
					type="button"
					class="list-group-item list-group-item-action"
					data-result
					disabled={disabled}
					onclick={() => selectPackageValue(item.name)}
					onkeydown={(event) => handleResultKeydown(event, index)}
				>
					<span class="fw-semibold">{item.name}</span>
					{#if item.version}
						<span class="badge text-bg-secondary ms-2">{item.version}</span>
					{/if}
					{#if item.description}
						<span class="d-block small text-body-secondary">
							{truncate(item.description, 120)}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	{:else if searchEmptyMessage}
		<p class="small text-body-secondary" role="status">{searchEmptyMessage}</p>
	{/if}

	{#if searchTerm.trim().length === 0}
		<div>
			<p class="small text-body-secondary mb-1">Popular packages</p>
			<div class="d-flex flex-wrap gap-3">
				{#each POPULAR_PACKAGES as name}
					<Button
						color="link"
						class="p-0"
						disabled={disabled}
						on:click={() => selectPopular(name)}
					>
						{name}
					</Button>
				{/each}
			</div>
		</div>
	{/if}
{/if}
