<script lang="ts">
	import { Collapsible } from "bits-ui";
	import type { Snippet } from "svelte";
	import ChevronDown from "~icons/carbon/chevron-down";

	type Props = {
		title: string;
		children?: Snippet;
	};

	let { title, children }: Props = $props();
	let open = $state(false);
</script>

<Collapsible.Root bind:open class="collapsible">
	<Collapsible.Trigger class="collapsible__trigger">
		<span>{title}</span>
		<span class="collapsible__chevron" aria-hidden="true">
			<ChevronDown />
		</span>
	</Collapsible.Trigger>
	<Collapsible.Content class="collapsible__content">
		{@render children?.()}
	</Collapsible.Content>
</Collapsible.Root>

<style>
	:global(.collapsible) {
		display: flex;
		flex-direction: column;
	}

	:global(.collapsible__trigger) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		min-height: var(--size-row-default);
		padding: 0;
		border: 0;
		border-top: var(--border-width) solid var(--color-border-subtle);
		background: transparent;
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-medium);
		text-align: left;
		cursor: pointer;
	}

	:global(.collapsible__trigger):focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-primary);
		outline-offset: calc(var(--border-width) * -1);
	}

	.collapsible__chevron {
		display: inline-flex;
		color: var(--color-text-muted);
		transition: transform var(--motion-fast) var(--ease);
	}

	.collapsible__chevron :global(svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	:global(.collapsible__trigger[data-state="open"]) .collapsible__chevron {
		transform: rotate(180deg);
	}

	:global(.collapsible__content) {
		padding: var(--space-3) 0 var(--space-2);
	}

	@media (hover: hover) and (pointer: fine) {
		:global(.collapsible__trigger):hover {
			color: var(--color-primary);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.collapsible__chevron {
			transition: none;
		}
	}
</style>
