<script lang="ts">
	import type { Snippet } from "svelte";

	type Variant = "primary" | "secondary" | "ghost" | "link" | "danger";
	type Props = {
		variant?: Variant;
		disabled?: boolean;
		loading?: boolean;
		type?: "button" | "submit" | "reset";
		onclick?: (event: MouseEvent) => void;
		class?: string;
		ariaLabel?: string;
		title?: string;
		children?: Snippet;
	};

	let {
		variant = "primary",
		disabled = false,
		loading = false,
		type = "button",
		onclick,
		class: className = "",
		ariaLabel,
		title,
		children,
	}: Props = $props();
</script>

<button
	class="button button--{variant} {className}"
	{type}
	disabled={disabled || loading}
	aria-busy={loading || undefined}
	aria-label={ariaLabel}
	{title}
	{onclick}
>
	{@render children?.()}
</button>

<style>
	.button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		height: var(--size-control-md);
		padding: 0 var(--space-3);
		border: var(--border-width) solid transparent;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-none);
		white-space: nowrap;
		cursor: pointer;
		touch-action: manipulation;
		transition:
			background-color var(--motion-fast) var(--ease),
			border-color var(--motion-fast) var(--ease),
			color var(--motion-fast) var(--ease);
	}

	.button:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-primary);
		outline-offset: var(--space-1);
	}

	.button--primary {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}

	.button--secondary {
		border-color: var(--color-border-strong);
		background: var(--color-canvas);
		color: var(--color-text-primary);
	}

	.button--ghost {
		color: var(--color-text-primary);
	}

	.button--danger {
		background: var(--color-error);
		color: var(--color-on-error);
	}

	.button--link {
		height: auto;
		padding: 0;
		border: 0;
		color: var(--color-primary);
		font-weight: var(--font-weight-medium);
		text-decoration: underline;
		text-underline-offset: var(--space-1);
	}

	@media (hover: hover) and (pointer: fine) {
		.button--primary:hover {
			background: var(--color-primary-hover);
		}

		.button--secondary:hover,
		.button--ghost:hover {
			background: var(--color-surface);
		}

		.button--danger:hover {
			background: var(--color-error-hover);
		}

		.button--link:hover {
			color: var(--color-primary-hover);
		}
	}

	.button:active {
		transform: translateY(1px);
	}

	.button:disabled {
		border-color: transparent;
		background: var(--color-surface-2);
		color: var(--color-text-disabled);
		cursor: not-allowed;
		transform: none;
	}

	.button--link:disabled {
		background: transparent;
		color: var(--color-text-disabled);
		text-decoration: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.button {
			transition: none;
		}

		.button:active {
			transform: none;
		}
	}
</style>
