<script lang="ts">
	import type { Snippet } from "svelte";

	type Gap = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
	type Align = "start" | "center" | "end" | "baseline" | "stretch";
	type Justify = "start" | "center" | "end" | "between";

	type Props = {
		gap?: Gap;
		align?: Align;
		justify?: Justify;
		wrap?: boolean;
		class?: string;
		children?: Snippet;
	};

	let {
		gap = "sm",
		align = "center",
		justify = "start",
		wrap = true,
		class: className = "",
		children,
	}: Props = $props();
</script>

<div
	class="inline inline--{justify} {wrap ? 'inline--wrap' : ''} {className}"
	style="--inline-gap: var(--space-{gap}); --inline-align: {align};"
>
	{@render children?.()}
</div>

<style>
	.inline {
		display: flex;
		flex-wrap: nowrap;
		gap: var(--inline-gap);
		align-items: var(--inline-align);
		min-width: 0;
	}

	.inline--wrap {
		flex-wrap: wrap;
	}

	.inline--start {
		justify-content: flex-start;
	}

	.inline--center {
		justify-content: center;
	}

	.inline--end {
		justify-content: flex-end;
	}

	.inline--between {
		justify-content: space-between;
	}
</style>
