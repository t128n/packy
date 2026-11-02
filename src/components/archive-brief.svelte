<script lang="ts"></script>

<aside class="brief" aria-labelledby="archive-brief-title">
	<h2 class="brief__title" id="archive-brief-title">Archive brief</h2>

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

	<p class="brief__note">
		Native binaries or external resources may need additional preparation
		before an offline install.
	</p>
</aside>

<style>
	.brief {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		padding-left: var(--space-5);
		border-left: var(--border-width) solid var(--color-border-subtle);
	}

	.brief__title {
		margin: 0;
		color: var(--color-text-muted);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		font-weight: var(--font-weight-regular);
		line-height: var(--font-leading-caption);
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
		gap: var(--space-3);
		padding: var(--space-2) 0;
		border-bottom: var(--border-width) solid var(--color-border-subtle);
	}

	.brief__row:first-child {
		border-top: var(--border-width) solid var(--color-border-subtle);
	}

	.brief__row dt {
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
	}

	.brief__row dd {
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		text-align: right;
	}

	.brief__mono {
		font-family: var(--font-family-mono);
	}

	.brief__note {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	@media (max-width: 1023px) {
		.brief {
			padding-top: var(--space-5);
			padding-left: 0;
			border-top: var(--border-width) solid var(--color-border-subtle);
			border-left: 0;
		}
	}
</style>
