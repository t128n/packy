<script lang="ts">
	type Props = {
		title: string;
		description?: string;
	};

	let { title, description }: Props = $props();
</script>

<header class="page-header">
	<h1 class="page-header__title">{title}</h1>
	{#if description}
		<p class="page-header__description">{description}</p>
	{/if}
</header>

<style>
	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.page-header__title {
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-heading-lg);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-heading-lg);
		letter-spacing: var(--font-tracking-heading-lg);
	}

	.page-header__description {
		max-width: var(--layout-measure);
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body-content);
		line-height: var(--font-leading-body-content);
	}

	@media (max-width: 767px) {
		.page-header__title {
			font-size: var(--font-size-heading-md);
			line-height: var(--font-leading-heading-md);
			letter-spacing: var(--font-tracking-heading-md);
		}
	}
</style>
