<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		title?: string;
		description?: string;
		id?: string;
		level?: 2 | 3 | 4;
		actions?: Snippet;
		gap?: "xs" | "sm" | "md" | "lg";
		class?: string;
		children?: Snippet;
	};

	let {
		title,
		description,
		id,
		level = 2,
		actions,
		gap = "sm",
		class: className = "",
		children,
	}: Props = $props();

	const generatedHeadingId = `section-${crypto.randomUUID()}`;
	const labelId = $derived(id ?? generatedHeadingId);
</script>

<section
	class="section {className}"
	id={id}
	aria-labelledby={title ? labelId : undefined}
>
	{#if title || description || actions}
		<header class="section__header">
			<div class="section__heading">
				{#if title}
					<svelte:element
						this={`h${level}`}
						id={labelId}
						class="section__title"
					>
						{title}
					</svelte:element>
				{/if}
				{#if description}
					<p class="section__description">{description}</p>
				{/if}
			</div>
			{#if actions}
				<div class="section__actions">{@render actions()}</div>
			{/if}
		</header>
	{/if}

	<div class="section__body" style="--section-gap: var(--space-{gap});">
		{@render children?.()}
	</div>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		min-width: 0;
	}

	.section__header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
	}

	.section__heading {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		min-width: 0;
	}

	.section__title {
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-heading-sm);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-heading-sm);
	}

	.section__description {
		max-width: var(--layout-measure);
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.section__actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-shrink: 0;
	}

	.section__body {
		display: flex;
		flex-direction: column;
		gap: var(--section-gap);
		min-width: 0;
	}
</style>
