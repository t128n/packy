<script lang="ts">
	import { valid, validRange, maxSatisfying } from "semver";
	import Add from "~icons/carbon/add";

	import Alert from "~/components/ui/alert.svelte";
	import Button from "~/components/ui/button.svelte";
	import Combobox from "~/components/ui/combobox.svelte";
	import Inline from "~/components/ui/inline.svelte";
	import Stack from "~/components/ui/stack.svelte";
	import Text from "~/components/ui/text.svelte";

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
				label: tag,
				description: `→ ${version}`,
				group: "Dist-tags",
			}));
	});

	let versionOptions = $derived.by(() => {
		const versions = sortedVersions
			.slice(0, MAX_VISIBLE_VERSIONS)
			.map(([version, meta]) => ({
				value: version,
				label: version,
				description: describeVersion(version, meta),
				group: "Versions",
			}));

		return [...tagOptions, ...versions];
	});

	let searchOptions = $derived(
		searchResults.map((result) => ({
			value: result.name,
			label: result.name,
			description: result.description
				? truncate(result.description, 120)
				: undefined,
		})),
	);

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

	let searchEmptyLabel = $derived(
		searchError
			? "Search failed. Try again."
			: searchEmptyMessage || "Type to search npm packages.",
	);


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

		pendingPackage = value;
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

	async function handleVersionSelect(value: string) {
		if (!value || disabled) {
			return;
		}

		versionSpec = value;
	}

	function useCustomSpec() {
		customMode = true;
		customSpec = versionSpec;
	}

	function usePublishedVersions() {
		customMode = false;
		customSpec = "";
		versionSpec = "latest";
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

<Stack gap="xl">
	{#if packageLoading}
		<p class="status" aria-live="polite">
			Loading {pendingPackage} from the npm registry…
		</p>
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
		<Stack gap="xl">
			<div class="package-header">
				<Stack gap="xs">
					<Text variant="caption" tone="muted">
						Selected package
					</Text>
					<Text variant="subheading" as="h2">{packageName}</Text>
					{#if packument.description}
						<Text variant="body-sm" tone="secondary">
							{packument.description}
						</Text>
					{/if}
				</Stack>
				<Button variant="secondary" onclick={clearSelection} {disabled}>
					Change package
				</Button>
			</div>

			{#if isDeprecated && resolvedMeta?.deprecated}
				<Alert tone="warning" title="Deprecated version">
					{resolvedMeta.deprecated}
				</Alert>
			{/if}

			<Stack gap="md">
				{#if customMode}
					<div class="field">
						<label class="field__label" for="version-spec">
							Version specification
						</label>
						<input
							id="version-spec"
							class="input"
							value={customSpec}
							oninput={(event) => {
								customSpec = event.currentTarget.value;
							}}
							placeholder="^18.0.0 or next"
							disabled={disabled}
							aria-describedby="version-spec-help"
							aria-invalid={customSpecError ? "true" : undefined}
						/>
						<p class="field__help" id="version-spec-help">
							Exact version, range, or published tag.
						</p>
						{#if customSpecError}
							<p class="field__error" role="alert">
								{customSpecError}
							</p>
						{/if}
					</div>
					<Inline>
						<Button
							variant="link"
							onclick={usePublishedVersions}
							{disabled}
						>
							Browse versions
						</Button>
					</Inline>
				{:else}
					<Combobox
						label="Version"
						placeholder={resolvedVersion || latestVersion}
						items={versionOptions}
						groups={["Dist-tags", "Versions"]}
						value={versionSpec}
						onValueChange={handleVersionSelect}
						filterMode="client"
						clearQueryOnClose
						restoreValueOnClose
						selectOnFocus
						triggerLabel="Open options"
						{disabled}
					/>
					<Inline>
						<Button variant="link" onclick={useCustomSpec} {disabled}>
							Use a version range or tag
						</Button>
					</Inline>
				{/if}

				<dl class="version-summary" data-testid="version-summary">
					<div class="version-summary__row">
						<dt>Requested</dt>
						<dd class="mono">{effectiveVersionSpec}</dd>
					</div>
					<div class="version-summary__row">
						<dt>Resolves to</dt>
						<dd class="mono">
							{resolvedVersion || "At build time"}
						</dd>
					</div>
					{#if selectedSize !== undefined}
						<div class="version-summary__row">
							<dt>Unpacked size</dt>
							<dd>{formatBytes(selectedSize)}</dd>
						</div>
					{/if}
				</dl>

				{#if capped}
					<Text variant="body-sm" tone="secondary">
						Showing the {MAX_VISIBLE_VERSIONS} newest versions. Use a
						custom specification for older versions.
					</Text>
				{/if}
			</Stack>

			<div class="action-row">
				<Button variant="primary" disabled={!canStart} onclick={start}>
					Create bundle
				</Button>
				<Text variant="body-sm" tone="secondary">
					Registry access is required to build. One package per archive.
				</Text>
			</div>
			{#if disabled}
				<Text variant="body-sm" tone="secondary">{disabledReason}</Text>
			{/if}
		</Stack>
	{:else}
		<Stack gap="xl">
			<Stack gap="sm">
				<Text variant="subheading" as="h2">Choose a package</Text>
				<Text variant="body-sm" tone="secondary">
					Search the npm registry, or start with a popular package.
					Required dependencies are bundled automatically.
				</Text>
			</Stack>

			<Stack gap="md">
				<Combobox
					label="Package"
					placeholder="Search npm packages…"
					items={searchOptions}
					value={pendingPackage}
					onValueChange={selectPackageValue}
					onInputValueChange={(value) => {
						searchTerm = value;
					}}
					onOpenChange={(open) => {
						if (open) void searchPackages(searchTerm);
					}}
					filterMode="manual"
					loading={searchLoading}
					emptyLabel={searchEmptyLabel}
					triggerLabel="Browse packages"
					clearQueryOnClose={false}
					{disabled}
				/>
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
				{/if}
				{#if searchTerm.trim().length === 0}
					<div class="quick-picks">
						<p class="quick-picks__label">Popular</p>
						<ul class="quick-picks__list">
							{#each POPULAR_PACKAGES as name}
								<li>
									<button
										class="quick-pick"
										type="button"
										onclick={() => selectPopular(name)}
										disabled={disabled}
									>
										<span class="quick-pick__name">{name}</span>
										<Add class="quick-pick__icon" />
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
				<Text variant="body-sm" tone="secondary">
					One package per archive. Registry access is required to build.
				</Text>
			</Stack>
		</Stack>
	{/if}
</Stack>

<style>
	.status {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.package-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	.version-summary {
		display: flex;
		flex-direction: column;
		margin: 0;
		border-top: var(--border-width) solid var(--color-border-subtle);
	}

	.version-summary__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-3);
		padding: var(--space-2) 0;
		border-bottom: var(--border-width) solid var(--color-border-subtle);
	}

	.version-summary__row dt {
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
	}

	.version-summary__row dd {
		margin: 0;
		text-align: right;
	}

	.quick-picks {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.quick-picks__label {
		margin: 0;
		color: var(--color-text-muted);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		line-height: var(--font-leading-caption);
		letter-spacing: var(--font-tracking-caps);
		text-transform: uppercase;
	}

	.quick-picks__list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0 var(--space-5);
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: var(--border-width) solid var(--color-border-subtle);
	}

	.quick-pick {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		width: 100%;
		min-height: var(--size-control-lg);
		padding: 0;
		border: 0;
		border-bottom: var(--border-width) solid var(--color-border-subtle);
		background: transparent;
		color: var(--color-text-primary);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-body);
		text-align: left;
		cursor: pointer;
	}

	.quick-pick :global(svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
		color: var(--color-text-muted);
	}

	@media (hover: hover) and (pointer: fine) {
		.quick-pick:hover {
			background: var(--color-surface);
		}

		.quick-pick:hover :global(svg) {
			color: var(--color-primary);
		}
	}

	.quick-pick:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-primary);
		outline-offset: calc(var(--border-width) * -1);
	}

	.quick-pick:disabled {
		color: var(--color-text-disabled);
		cursor: not-allowed;
	}

	.action-row {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	@media (max-width: 639px) {
		.quick-picks__list {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
