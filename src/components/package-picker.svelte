<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Combobox,
		Inline,
		Input,
		Stack,
		Text,
	} from "@t128n/ui";
	import { tick } from "svelte";
	import { valid, validRange, maxSatisfying } from "semver";

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
	let versionFilter = $state("");
	let customMode = $state(false);
	let customSpec = $state("");

	let searchRequestId = 0;
	let loadRequestId = 0;

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

	let versionCount = $derived(sortedVersions.length);
	let latestVersion = $derived(
		packument?.["dist-tags"].latest ?? sortedVersions[0]?.[0] ?? "",
	);
	let capped = $derived(versionCount > MAX_VISIBLE_VERSIONS);

	let tagOptions = $derived.by(() => {
		const currentPackument = packument;

		if (!currentPackument) {
			return [];
		}

		return Object.entries(currentPackument["dist-tags"])
			.filter(
				([tag]) =>
					!Object.hasOwn(currentPackument.versions, tag),
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
			.map(([tag, version]) => ({
				value: tag,
				label: `Dist-tag · ${tag} → ${version}`,
			}));
	});

	let versionOptions = $derived.by(() => {
		const versions = sortedVersions
			.slice(0, MAX_VISIBLE_VERSIONS)
			.map(([version, meta]) => ({
				value: version,
				label: describeVersion(version, meta),
			}));

		return [...tagOptions, ...versions];
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

	let summaryVersionText = $derived.by(() => {
		if (!effectiveVersionSpec) {
			return "";
		}

		const parts = [effectiveVersionSpec];

		if (resolvedVersion && resolvedVersion !== effectiveVersionSpec) {
			parts.push(`resolves to ${resolvedVersion}`);
		}

		if (!resolvedVersion) {
			parts.push("resolved during the build");
		}

		if (selectedSize !== undefined) {
			parts.push(`${formatBytes(selectedSize)} unpacked`);
		}

		return parts.join(" · ");
	});

	let versionDescription = $derived.by(() => {
		if (versionCount === 0) {
			return "No published versions were found.";
		}

		return "";
	});

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

		try {
			const data = await loadPackument(trimmed);

			if (requestId !== loadRequestId) {
				return;
			}

			packument = data;
			packageName = data.name;
			versionSpec = "latest";
			versionFilter = "";
			customMode = false;
			customSpec = "";
			searchTerm = "";
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

	function selectSearchResult(result: RegistrySearchResult) {
		if (disabled) {
			return;
		}

		searchTerm = "";
		void loadPackage(result.name);
	}

	function selectPopular(name: string) {
		if (disabled) {
			return;
		}

		searchTerm = "";
		void loadPackage(name);
	}

	async function handleVersionSelect(value: string) {
		if (!value || disabled) {
			return;
		}

		versionSpec = value;

		await tick();
		versionFilter = "";
	}

	function useCustomSpec() {
		customMode = true;
		customSpec = versionSpec;
		versionFilter = "";
	}

	function usePublishedVersions() {
		customMode = false;
		customSpec = "";
		versionSpec = "latest";
		versionFilter = "";
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

	function clearSelection() {
		loadRequestId += 1;
		packument = null;
		packageName = "";
		packageLoading = false;
		packageError = "";
		pendingPackage = "";
		versionSpec = "latest";
		versionFilter = "";
		customMode = false;
		customSpec = "";
		searchTerm = "";
		searchResults = [];
		searchError = "";
		searchLoading = false;
		searchAttempted = false;
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
		const parts = [`Version · ${version}`];

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

<Stack gap="lg">
	{#if packageLoading}
		<Text variant="body-sm" tone="secondary" aria-live="polite">
			Loading {pendingPackage} from the npm registry…
		</Text>
	{:else if packageError}
		<Stack gap="sm">
			<Alert tone="danger" title="Could not load package">
				{packageError}
			</Alert>
			<Inline gap="sm" wrap>
				<Button variant="link" onclick={retryLoad} disabled={disabled}>
					Retry
				</Button>
				<Button
					variant="link"
					onclick={clearSelection}
					disabled={disabled}
				>
					Choose another package
				</Button>
			</Inline>
		</Stack>
	{:else if packument}
		<Stack gap="lg">
			<Inline justify="between" align="start" gap="md" wrap>
				<Stack gap="xs">
					<Text variant="subheading" as="h2">{packageName}</Text>
					{#if packument.description}<Text variant="body-sm" tone="secondary">{packument.description}</Text>{/if}
				</Stack>
				<Button variant="secondary" onclick={clearSelection} {disabled}>Change package</Button>
			</Inline>
			{#if isDeprecated && resolvedMeta?.deprecated}<Alert tone="warning" title="Deprecated version">{resolvedMeta.deprecated}</Alert>{/if}
			{#if customMode}
				<Stack gap="sm">
					<Input label="Version specification" value={customSpec} oninput={(event) => { customSpec = event.currentTarget.value; }} description="Exact version, range, or published tag." placeholder="^18.0.0 or next" error={customSpecError} {disabled} />
					<Text variant="body-sm" tone="secondary">Requested: {summaryVersionText}</Text>
					<Inline><Button variant="link" onclick={usePublishedVersions} {disabled}>Browse versions</Button></Inline>
				</Stack>
			{:else}
				<Stack gap="sm">
					<Combobox label="Version" description={versionDescription} placeholder={effectiveVersionSpec === "latest" ? `latest (${latestVersion})` : effectiveVersionSpec} items={versionOptions} value={versionSpec} onValueChange={handleVersionSelect} bind:inputValue={versionFilter} {disabled} />
					<Text variant="body-sm" tone="secondary">Requested: {effectiveVersionSpec}{#if resolvedVersion && resolvedVersion !== effectiveVersionSpec} · Currently points to {resolvedVersion}; npm resolves the tag when building.{/if}</Text>
					{#if capped}<Text variant="body-sm" tone="secondary">Showing the {MAX_VISIBLE_VERSIONS} newest versions. Use a custom specification for older versions.</Text>{/if}
					<Inline><Button variant="link" onclick={useCustomSpec} {disabled}>Use a version range or tag</Button></Inline>
				</Stack>
			{/if}
		</Stack>
	{:else}
		<Stack gap="md">
			<Input
				label="Package"
				placeholder="Search npm packages…"
				value={searchTerm}
				oninput={(event) => {
					searchTerm = event.currentTarget.value;
				}}
				onkeydown={(event) => {
					const first = searchResults.at(0);

					if (event.key === "Enter" && !event.isComposing && first) {
						event.preventDefault();
						selectSearchResult(first);
					}
				}}
				disabled={disabled}
			/>
			{#if searchLoading}
				<Text variant="body-sm" tone="secondary" aria-live="polite">
					Searching the npm registry…
				</Text>
			{/if}
			{#if searchError}
				<Stack gap="sm">
					<Alert tone="danger" title="Could not search npm">
						{searchError}
					</Alert>
					<Inline gap="sm">
						<Button
							variant="link"
							onclick={retrySearch}
							disabled={disabled}
						>
							Retry search
						</Button>
					</Inline>
				</Stack>
			{:else if searchEmptyMessage}
				<Text variant="body-sm" tone="secondary" aria-live="polite">
					{searchEmptyMessage}
				</Text>
			{/if}
			{#if searchResults.length > 0}
				<Stack gap="xs">
					<Text variant="body-sm" tone="secondary" aria-live="polite">
						{searchResults.length} {searchResults.length === 1 ? "result" : "results"}
					</Text>
					{#each searchResults as result (result.name)}
						<button
							class="package-result"
							type="button"
							onclick={() => selectSearchResult(result)}
							disabled={disabled}
						>
							<span class="result-heading">
								<Text as="span" variant="label">
									{result.name}
								</Text>
								{#if result.version}
									<Badge tone="neutral">
										v{result.version}
									</Badge>
								{/if}
							</span>
							{#if result.description}
								<Text as="span" variant="body-sm" tone="secondary">
									{truncate(result.description, 120)}
								</Text>
							{/if}
						</button>
					{/each}
				</Stack>
			{/if}
			{#if searchTerm.trim().length === 0}
				<Stack gap="sm">
					<Text variant="label" tone="secondary">
						Popular packages
					</Text>
					<Inline gap="sm" wrap>
						{#each POPULAR_PACKAGES as name}
							<Button
								variant="link"
								onclick={() => selectPopular(name)}
								disabled={disabled}
							>
								{name}
							</Button>
						{/each}
					</Inline>
				</Stack>
			{/if}
		</Stack>
	{/if}

	{#if packument}
		<Text variant="body-sm" tone="secondary">Registry access is required to build. Peer dependencies and packages requiring install scripts may need extra steps offline.</Text>
		<Inline gap="sm" align="center" wrap>
			<Button variant="primary" disabled={!canStart} onclick={start}>Create bundle</Button>
			{#if disabled}<Text variant="body-sm" tone="secondary">{disabledReason}</Text>{/if}
		</Inline>
	{/if}
</Stack>

<style>
	.result-heading { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
	.package-result {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--space-xs);
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		border: 0;
		border-bottom: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-primary);
		font-family: var(--font-family-sans);
		text-align: left;
		cursor: pointer;
	}

	.package-result:last-child {
		border-bottom: 0;
	}

	.package-result:hover:not(:disabled) {
		background: var(--color-surface-subtle);
	}

	.package-result:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-focus);
		outline-offset: calc(-1 * var(--border-width-emphasis));
	}

	.package-result:disabled {
		color: var(--color-disabled-text);
		cursor: not-allowed;
	}
</style>
