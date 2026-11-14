<script lang="ts">
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
		onSelect?: () => void;
	};

	let {
		disabled = false,
		disabledReason = "Wait for the current run to finish.",
		onStart,
		onSelect,
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
			onSelect?.();
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

{#if packument}
	<div class="app-header-row">
		<div>
			<h2>{packageName}</h2>
			{#if packument.description}
				<p class="app-muted">{packument.description}</p>
			{/if}
			<p>
				<span class="app-muted">Requested:</span>
				{effectiveVersionSpec}{#if resolvedVersion && resolvedVersion !== effectiveVersionSpec}{" · "}<span class="app-muted">Resolved:</span>
					{resolvedVersion}{:else if !resolvedVersion && effectiveVersionSpec}{" · "}<span class="app-muted">Resolved during build</span>{/if}{#if selectedSize !== undefined}{" · "}{formatBytes(selectedSize)} unpacked{/if}
			</p>
		</div>
		<button type="button" onclick={clearSelection} {disabled}>
			Change package
		</button>
	</div>

	{#if isDeprecated && resolvedMeta?.deprecated}
		<aside role="alert" data-status="warn">
			<h3>Deprecated version</h3>
			<p>{resolvedMeta.deprecated}</p>
		</aside>
	{/if}

	<form
		class="app-form-row"
		onsubmit={(event) => {
			event.preventDefault();
			start();
		}}
	>
		<div class="app-form-field">
			{#if customMode}
				<label for="custom-version">Version specification</label>
				<input
					id="custom-version"
					type="text"
					value={customSpec}
					placeholder="^18.0.0 or next"
					aria-invalid={customSpecError ? "true" : undefined}
					oninput={handleCustomSpecInput}
					bind:this={customField}
					{disabled}
				/>
				{#if customSpecError}
					<p data-status="error" role="alert">{customSpecError}</p>
				{:else}
					<p class="app-muted">
						<small>Exact version, semver range, or published tag.</small>
					</p>
				{/if}
			{:else}
				<label for="version-select">Version</label>
				<select
					id="version-select"
					value={versionSpec}
					onchange={handleVersionChange}
					bind:this={versionField}
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
				</select>
				{#if capped}
					<p class="app-muted">
						<small>
							Showing the {MAX_VISIBLE_VERSIONS} newest versions. Use a
							custom specification for older versions.
						</small>
					</p>
				{/if}
			{/if}
		</div>
		<div>
			<button type="submit" disabled={!canStart}>Create bundle</button>
		</div>
	</form>

	<details>
		<summary class="app-muted">Advanced options</summary>
		<div>
			{#if customMode}
				<p class="app-muted">
					Enter an exact version, a semver range, or a published dist-tag.
				</p>
				<button type="button" onclick={usePublishedVersions} {disabled}>
					Browse published versions
				</button>
			{:else}
				<p class="app-muted">
					Choose a published version above, or specify a range or tag.
				</p>
				<button type="button" onclick={useCustomSpec} {disabled}>
					Use a version range or tag
				</button>
			{/if}
		</div>
	</details>

	{#if disabled}
		<p class="app-muted"><small>{disabledReason}</small></p>
	{/if}
{:else}
	<div>
		<label for="package-search">Package</label>
		<input
			id="package-search"
			type="search"
			value={searchTerm}
			placeholder="Search npm packages…"
			autocomplete="off"
			spellcheck="false"
			aria-invalid={packageError ? "true" : undefined}
			disabled={disabled || packageLoading}
			oninput={handleSearchInput}
			onkeydown={handleSearchKeydown}
			bind:this={searchField}
		/>

		{#if packageLoading}
			<p class="app-muted" aria-busy="true" aria-live="polite">
				Loading {pendingPackage}…
			</p>
		{:else if packageError}
			<aside role="alert" data-status="error">
				<p>{packageError}</p>
				<menu>
					<li>
						<button type="button" onclick={retryLoad}>Retry</button>
					</li>
					<li>
						<button type="button" onclick={clearSelection}>
							Choose another package
						</button>
					</li>
				</menu>
			</aside>
		{:else if searchLoading}
			<p class="app-muted" aria-busy="true" aria-live="polite">
				Searching npm…
			</p>
		{:else if searchError}
			<p data-status="error" role="alert">
				{searchError}
				<button type="button" onclick={retrySearch}>Retry</button>
			</p>
		{:else if searchResults.length > 0}
			<div
				class="app-result-list"
				bind:this={resultsList}
				aria-label="Package search results"
			>
				{#each searchResults as item, index (item.name)}
					<button
						type="button"
						data-result
						{disabled}
						onclick={() => selectPackageValue(item.name)}
						onkeydown={(event) => handleResultKeydown(event, index)}
					>
						<strong>{item.name}</strong>
						{#if item.version}
							<span class="app-result-meta">{item.version}</span>
						{/if}
						{#if item.description}
							<span class="app-result-meta">
								— {truncate(item.description, 120)}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		{:else if searchEmptyMessage}
			<p class="app-muted" role="status">{searchEmptyMessage}</p>
		{/if}

		{#if !packageLoading && !packageError && searchTerm.trim().length === 0}
			<menu aria-label="Popular packages">
				<li class="app-muted">Popular:</li>
				{#each POPULAR_PACKAGES as name (name)}
					<li>
						<button
							type="button"
							{disabled}
							onclick={() => selectPopular(name)}
						>
							{name}
						</button>
					</li>
				{/each}
			</menu>
		{/if}
	</div>
{/if}
