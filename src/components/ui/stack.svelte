<script lang="ts">
	import type { Snippet } from "svelte";

	type Gap = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
	type Align = "start" | "center" | "end" | "stretch";

	type Props = {
		gap?: Gap;
		align?: Align;
		class?: string;
		children?: Snippet;
	};

	let { gap = "md", align = "stretch", class: className = "", children }: Props =
		$props();
</script>

<div
	class="stack {className}"
	style="--stack-gap: var(--space-{gap}); --stack-align: {align};"
>
	{@render children?.()}
</div>

<style>
	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--stack-gap);
		align-items: var(--stack-align);
	}
</style>
