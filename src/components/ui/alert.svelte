<script lang="ts">
	import type { Snippet } from "svelte";

	type Tone = "neutral" | "info" | "success" | "warning" | "danger";
	type Props = {
		tone?: Tone;
		title?: string;
		class?: string;
		children?: Snippet;
	};

	let { tone = "neutral", title, class: className = "", children }: Props =
		$props();
</script>

<div
	class="alert alert--{tone} {className}"
	role={tone === "danger" || tone === "warning" ? "alert" : "status"}
>
	{#if title}
		<p class="alert__title">{title}</p>
	{/if}
	<div class="alert__body">
		{@render children?.()}
	</div>
</div>

<style>
	.alert {
		--alert-tone: var(--color-text-secondary);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		border-left: var(--border-width-emphasis) solid var(--alert-tone);
		background: var(--color-surface);
		color: var(--color-text-primary);
	}

	.alert--neutral {
		--alert-tone: var(--color-text-secondary);
	}

	.alert--info {
		--alert-tone: var(--color-primary);
	}

	.alert--success {
		--alert-tone: var(--color-success);
	}

	.alert--warning {
		--alert-tone: var(--color-warning);
	}

	.alert--danger {
		--alert-tone: var(--color-error);
	}

	.alert__title {
		margin: 0;
		color: var(--alert-tone);
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-body);
	}

	.alert__body {
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}
</style>
