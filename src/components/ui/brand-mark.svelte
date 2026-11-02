<script lang="ts">
	import Cube from "~icons/carbon/cube";

	type Props = {
		size?: "sm" | "md";
	};

	let { size = "md" }: Props = $props();
</script>

<span class="brand-mark brand-mark--{size}" aria-hidden="true">
	<Cube />
</span>

<style>
	.brand-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		background: var(--color-primary);
		color: var(--color-on-primary);
		border-radius: var(--radius-sm);
	}

	.brand-mark--sm {
		width: var(--space-6);
		height: var(--space-6);
	}

	.brand-mark--md {
		width: var(--space-7);
		height: var(--space-7);
	}

	.brand-mark :global(svg) {
		width: var(--icon-md);
		height: var(--icon-md);
	}
</style>
