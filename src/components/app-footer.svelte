<script lang="ts">
	const commitHash = __GIT_COMMIT_HASH__;
	const commitUrl = `https://github.com/t128n/packy/commit/${commitHash}`;
</script>

<footer class="app-footer">
	<div class="app-footer__inner">
		<div class="app-footer__group">
			<span class="app-footer__note">Runs in your browser</span>
			<span class="app-footer__divider" aria-hidden="true"></span>
			<a class="app-footer__link app-footer__mono" href={commitUrl} target="_blank" rel="noreferrer">
				build {commitHash.slice(0, 7)}
			</a>
		</div>

		<div class="app-footer__group">
			<a class="app-footer__link" href="https://t128n.dev" target="_blank" rel="noreferrer">
				t128n.dev
			</a>
			<span class="app-footer__note">© 2026 Torben Haack</span>
		</div>
	</div>
</footer>

<style>
	.app-footer {
		width: 100%;
		max-width: calc(
			var(--layout-shell) + var(--layout-page-padding) +
				var(--layout-page-padding)
		);
		margin-inline: auto;
		padding: var(--space-4) var(--layout-page-padding);
		border-top: var(--border-width) solid var(--color-border-subtle);
	}

	.app-footer__inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}

	.app-footer__group {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.app-footer__note,
	.app-footer__link {
		color: var(--color-text-muted);
		font-size: var(--font-size-caption);
		line-height: var(--font-leading-caption);
	}

	.app-footer__link {
		text-decoration: underline;
		text-decoration-color: var(--color-border-strong);
		text-underline-offset: var(--space-1);
	}

	.app-footer__link:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-primary);
		outline-offset: var(--space-1);
	}

	.app-footer__divider {
		width: var(--border-width);
		height: var(--space-3);
		background: var(--color-border-subtle);
	}

	.app-footer__mono {
		font-family: var(--font-family-mono);
	}

	@media (hover: hover) and (pointer: fine) {
		.app-footer__link:hover {
			color: var(--color-primary);
			text-decoration-color: var(--color-primary);
		}
	}
</style>
