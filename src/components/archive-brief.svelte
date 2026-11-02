<script lang="ts">
	import { Text } from "@t128n/ui";
</script>

<aside class="brief" aria-labelledby="archive-brief-title">
	<Text
		variant="caption"
		tone="secondary"
		as="h2"
		id="archive-brief-title"
		class="brief__title"
	>
		Archive brief
	</Text>

	<dl class="brief__list">
		<div class="brief__row">
			<dt>Output</dt>
			<dd class="brief__mono">.tgz</dd>
		</div>
		<div class="brief__row">
			<dt>Install scripts</dt>
			<dd>Disabled</dd>
		</div>
		<div class="brief__row">
			<dt>Execution</dt>
			<dd>This browser</dd>
		</div>
		<div class="brief__row">
			<dt>Peer deps</dt>
			<dd>Optional only</dd>
		</div>
	</dl>

	<Text variant="body-sm" tone="secondary" class="brief__note">
		Native binaries or external resources may need additional preparation
		before an offline install.
	</Text>
</aside>

<style>
	.brief {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		padding-left: var(--space-xl);
		border-left: var(--border-width) solid var(--color-border);
	}

	:global(.brief__title) {
		margin: 0;
		font-family: var(--font-family-mono);
		letter-spacing: var(--font-tracking-caps);
		text-transform: uppercase;
	}

	.brief__list {
		display: flex;
		flex-direction: column;
		margin: 0;
	}

	.brief__row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: var(--space-md);
		padding: var(--space-sm) 0;
		border-bottom: var(--border-width) solid var(--color-border);
	}

	.brief__row:first-child {
		border-top: var(--border-width) solid var(--color-border);
	}

	.brief__row dt {
		color: var(--color-text-secondary);
		font-size: var(--font-size-body-sm);
	}

	.brief__row dd {
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-body-sm);
		text-align: right;
	}

	.brief__mono {
		font-family: var(--font-family-mono);
	}

	:global(.brief__note) {
		margin: 0;
	}

	@media (max-width: 1024px) {
		.brief {
			padding-top: var(--space-xl);
			padding-left: 0;
			border-top: var(--border-width) solid var(--color-border);
			border-left: 0;
		}
	}
</style>
