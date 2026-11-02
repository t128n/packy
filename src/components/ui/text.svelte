<script lang="ts">
	import type { Snippet } from "svelte";

	type Variant =
		| "display"
		| "heading"
		| "subheading"
		| "body"
		| "body-sm"
		| "label"
		| "caption";
	type Tone =
		| "primary"
		| "secondary"
		| "muted"
		| "success"
		| "danger"
		| "inherit";
	type Weight = "regular" | "medium" | "semibold";
	type Tag =
		| "p"
		| "span"
		| "div"
		| "h1"
		| "h2"
		| "h3"
		| "h4"
		| "h5"
		| "h6"
		| "strong"
		| "dt"
		| "dd"
		| "li"
		| "legend"
		| "figcaption";

	type Props = {
		variant?: Variant;
		tone?: Tone;
		weight?: Weight;
		as?: Tag;
		numeric?: boolean;
		class?: string;
		id?: string;
		children?: Snippet;
	};

	let {
		variant = "body",
		tone = "primary",
		weight = "regular",
		as = "p",
		numeric = false,
		class: className = "",
		id,
		children,
	}: Props = $props();
</script>

<svelte:element
	this={as}
	{id}
	class="text text--{variant} text--{tone} text--{weight} {numeric
		? 'text--numeric'
		: ''} {className}"
>
	{@render children?.()}
</svelte:element>

<style>
	.text {
		margin: 0;
	}

	.text--display {
		font-size: var(--font-size-heading-lg);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-heading-lg);
		letter-spacing: var(--font-tracking-heading-lg);
	}

	.text--heading {
		font-size: var(--font-size-heading-md);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-heading-md);
		letter-spacing: var(--font-tracking-heading-md);
	}

	.text--subheading {
		font-size: var(--font-size-heading-sm);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-heading-sm);
	}

	.text--body {
		font-size: var(--font-size-body-content);
		line-height: var(--font-leading-body-content);
	}

	.text--body-sm {
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.text--label {
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-medium);
		line-height: var(--font-leading-body);
	}

	.text--caption {
		font-size: var(--font-size-caption);
		font-weight: var(--font-weight-medium);
		line-height: var(--font-leading-caption);
	}

	.text--primary {
		color: var(--color-text-primary);
	}

	.text--secondary {
		color: var(--color-text-secondary);
	}

	.text--muted {
		color: var(--color-text-muted);
	}

	.text--success {
		color: var(--color-success);
	}

	.text--danger {
		color: var(--color-error);
	}

	.text--inherit {
		color: inherit;
	}

	.text--regular {
		font-weight: var(--font-weight-regular);
	}

	.text--medium {
		font-weight: var(--font-weight-medium);
	}

	.text--semibold {
		font-weight: var(--font-weight-semibold);
	}

	.text--numeric {
		font-variant-numeric: tabular-nums;
	}
</style>
