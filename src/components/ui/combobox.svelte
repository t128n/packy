<script lang="ts">
	import { Combobox } from "bits-ui";
	import Checkmark from "~icons/carbon/checkmark";
	import ChevronDown from "~icons/carbon/chevron-down";

	export type ComboboxItem = {
		value: string;
		label: string;
		description?: string;
		group?: string;
		disabled?: boolean;
	};

	type Props = {
		items: ComboboxItem[];
		value: string;
		onValueChange: (value: string) => void;
		label: string;
		placeholder?: string;
		disabled?: boolean;
		loading?: boolean;
		loadingLabel?: string;
		emptyLabel?: string;
		groups?: string[];
		filterMode?: "client" | "manual";
		onInputValueChange?: (value: string) => void;
		onOpenChange?: (open: boolean) => void;
		triggerLabel?: string;
		restoreValueOnClose?: boolean;
		clearQueryOnClose?: boolean;
		selectOnFocus?: boolean;
		openOnFocus?: boolean;
		id?: string;
		class?: string;
	};

	let {
		items,
		value,
		onValueChange,
		label,
		placeholder = "Search…",
		disabled = false,
		loading = false,
		loadingLabel = "Loading…",
		emptyLabel = "No results",
		groups = [],
		filterMode = "client",
		onInputValueChange,
		onOpenChange,
		triggerLabel = "Open options",
		restoreValueOnClose = false,
		clearQueryOnClose = true,
		selectOnFocus = false,
		openOnFocus = true,
		id,
		class: className = "",
	}: Props = $props();

	const generatedId = `combobox-${crypto.randomUUID()}`;
	const inputId = $derived(id ?? generatedId);
	let open = $state(false);
	let query = $state("");
	let inputElement = $state<HTMLInputElement | null>(null);

	const filteredItems = $derived.by(() => {
		if (filterMode === "manual") {
			return items;
		}

		const term = query.trim().toLowerCase();

		if (!term) {
			return items;
		}

		return items.filter((item) => {
			return (
				item.label.toLowerCase().includes(term) ||
				item.description?.toLowerCase().includes(term)
			);
		});
	});

	const groupOrder = $derived.by(() => {
		if (groups.length > 0) {
			return groups;
		}

		return [
			...new Set(
				filteredItems
					.map((item) => item.group)
					.filter((group): group is string => Boolean(group)),
			),
		];
	});

	const ungroupedItems = $derived(
		filteredItems.filter((item) => !item.group),
	);

	function selectedLabel(): string {
		return items.find((item) => item.value === value)?.label ?? "";
	}

	function itemsForGroup(group: string): ComboboxItem[] {
		return filteredItems.filter((item) => item.group === group);
	}

	function handleInput(event: Event & { currentTarget: HTMLInputElement }) {
		query = event.currentTarget.value;
		onInputValueChange?.(query);

		if (!open) {
			open = true;
		}
	}

	function handleFocus() {
		if (openOnFocus && !open) {
			open = true;
		}

		if (selectOnFocus) {
			inputElement?.select();
		}
	}

	function handleValueChange(next: string) {
		query = "";
		onInputValueChange?.("");
		onValueChange(next);

		const labelText =
			items.find((item) => item.value === next)?.label ?? "";
		if (inputElement) {
			inputElement.value = labelText;
		}
	}

	$effect(() => {
		const isOpen = open;
		onOpenChange?.(isOpen);

		if (isOpen) {
			return;
		}

		if (clearQueryOnClose) {
			query = "";
			onInputValueChange?.("");
		}

		if (restoreValueOnClose && inputElement) {
			inputElement.value = selectedLabel();
		}
	});

	$effect(() => {
		if (!inputElement) {
			return;
		}

		if (query.length > 0) {
			return;
		}

		if (open && document.activeElement === inputElement) {
			return;
		}

		const labelText = selectedLabel();
		if (inputElement.value !== labelText) {
			inputElement.value = labelText;
		}
	});
</script>

<div class="combobox {className}">
	<label class="combobox__label" for={inputId}>{label}</label>
	<div class="combobox__control">
		<Combobox.Root
			type="single"
			{items}
			{value}
			onValueChange={handleValueChange}
			bind:open
			{disabled}
		>
			<Combobox.Input
				bind:ref={inputElement}
				id={inputId}
				class="combobox__input"
				{placeholder}
				{disabled}
				oninput={handleInput}
				onfocus={handleFocus}
			/>
			<Combobox.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						class="combobox__trigger"
						type="button"
						aria-label={triggerLabel}
						aria-expanded={open}
						data-state={open ? "open" : "closed"}
						disabled={disabled}
						onpointerdown={(event) => event.preventDefault()}
						onpointerup={(event) => event.preventDefault()}
						onclick={(event) => {
							event.preventDefault();
							if (disabled) return;

							const next = !open;
							open = next;
							if (next) inputElement?.focus();
						}}
					>
						<ChevronDown />
					</button>
				{/snippet}
			</Combobox.Trigger>

			<Combobox.Portal>
				<Combobox.Content class="combobox__content" sideOffset={4}>
					<Combobox.Viewport class="combobox__viewport">
						{#if loading}
							<p class="combobox__status">{loadingLabel}</p>
						{:else if filteredItems.length === 0}
							<p class="combobox__status">{emptyLabel}</p>
						{:else}
							{#each groupOrder as group (group)}
								<Combobox.Group class="combobox__group">
									<Combobox.GroupHeading class="combobox__group-heading">
										{group}
									</Combobox.GroupHeading>
									{#each itemsForGroup(group) as item (item.value)}
										<Combobox.Item
											value={item.value}
											label={item.label}
											disabled={item.disabled}
											class="combobox__item"
										>
											{#snippet children({ selected })}
												<span class="combobox__item-body">
													<span class="combobox__item-label">
														{item.label}
													</span>
													{#if item.description}
														<span class="combobox__item-description">
															{item.description}
														</span>
													{/if}
												</span>
												{#if selected}
													<span class="combobox__check" aria-hidden="true">
														<Checkmark />
													</span>
												{/if}
											{/snippet}
										</Combobox.Item>
									{/each}
								</Combobox.Group>
							{/each}

							{#each ungroupedItems as item (item.value)}
								<Combobox.Item
									value={item.value}
									label={item.label}
									disabled={item.disabled}
									class="combobox__item"
								>
									{#snippet children({ selected })}
										<span class="combobox__item-body">
											<span class="combobox__item-label">{item.label}</span>
											{#if item.description}
												<span class="combobox__item-description">
													{item.description}
												</span>
											{/if}
										</span>
										{#if selected}
											<span class="combobox__check" aria-hidden="true">
												<Checkmark />
											</span>
										{/if}
									{/snippet}
								</Combobox.Item>
							{/each}
						{/if}
					</Combobox.Viewport>
				</Combobox.Content>
			</Combobox.Portal>
		</Combobox.Root>
	</div>
</div>

<style>
	.combobox {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.combobox__label {
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-regular);
		line-height: var(--font-leading-body);
	}

	.combobox__control {
		position: relative;
		display: flex;
		min-width: 0;
	}

	:global(.combobox__input) {
		width: 100%;
		height: var(--size-control-md);
		padding: 0 var(--layout-input-icon-offset) 0 var(--space-3);
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-canvas);
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
		transition: border-color var(--motion-fast) var(--ease);
	}

	:global(.combobox__input)::placeholder {
		color: var(--color-text-muted);
		opacity: 1;
	}

	:global(.combobox__input):focus-visible {
		border-color: var(--color-primary);
		outline: var(--border-width-emphasis) solid var(--color-primary);
		outline-offset: var(--space-1);
	}

	:global(.combobox__input):disabled {
		border-color: var(--color-border-subtle);
		background: var(--color-surface);
		color: var(--color-text-disabled);
		cursor: not-allowed;
	}

	:global(.combobox__trigger) {
		position: absolute;
		top: 50%;
		right: var(--space-1);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size-control-sm);
		height: var(--size-control-sm);
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
		transform: translateY(-50%);
	}

	:global(.combobox__trigger svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	:global(.combobox__trigger):focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-primary);
		outline-offset: calc(var(--border-width) * -1);
	}

	@media (hover: hover) and (pointer: fine) {
		:global(.combobox__input):hover:not(:disabled) {
			border-color: var(--color-text-secondary);
		}

		:global(.combobox__trigger):hover {
			background: var(--color-surface);
			color: var(--color-text-primary);
		}
	}

	:global(.combobox__content) {
		z-index: var(--z-dropdown);
		width: var(--bits-combobox-anchor-width);
		min-width: var(--layout-menu-min);
		max-width: var(--layout-menu-max);
		border: var(--border-width) solid var(--color-border-strong);
		border-radius: var(--radius-md);
		background: var(--color-canvas);
		box-shadow: var(--shadow-overlay);
		color: var(--color-text-primary);
	}

	:global(.combobox__viewport) {
		max-height: var(--layout-menu-max);
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: var(--space-1);
	}

	.combobox__status {
		margin: 0;
		padding: var(--space-2) var(--space-3);
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	:global(.combobox__group + .combobox__group) {
		margin-top: var(--space-1);
	}

	:global(.combobox__group-heading) {
		padding: var(--space-2) var(--space-2) var(--space-1);
		color: var(--color-text-muted);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		font-weight: var(--font-weight-regular);
		letter-spacing: var(--font-tracking-caps);
		text-transform: uppercase;
	}

	:global(.combobox__item) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: var(--size-row-compact);
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		color: var(--color-text-primary);
		cursor: pointer;
	}

	:global(.combobox__item[data-highlighted]) {
		background: var(--color-surface);
	}

	:global(.combobox__item[data-disabled]) {
		color: var(--color-text-disabled);
		cursor: not-allowed;
	}

	.combobox__item-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.combobox__item-label {
		overflow: hidden;
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.combobox__item-description {
		overflow: hidden;
		color: var(--color-text-secondary);
		font-size: var(--font-size-caption);
		line-height: var(--font-leading-caption);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.combobox__check {
		display: inline-flex;
		flex-shrink: 0;
		color: var(--color-primary);
	}

	.combobox__check :global(svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	@media (max-width: 767px) {
		:global(.combobox__content) {
			min-width: var(--layout-menu-min);
			max-width: calc(100vw - var(--space-6));
		}
	}
</style>
