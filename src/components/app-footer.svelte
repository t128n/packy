<script lang="ts">
	import { Inline, Link, Text } from "@t128n/ui";

	const commitHash = __GIT_COMMIT_HASH__;
	const commitUrl = `https://github.com/t128n/packy/commit/${commitHash}`;
</script>

<footer class="app-footer">
	<Inline justify="between" align="center" gap="lg" wrap>
		<Inline gap="md" align="center" wrap>
			<Text variant="caption" tone="secondary">
				Runs in your browser
			</Text>
			<span class="app-footer__divider" aria-hidden="true"></span>
			<Link
				href={commitUrl}
				variant="ghost"
				target="_blank"
				rel="noreferrer"
			>
				<Text variant="caption" tone="secondary" class="app-footer__mono">
					build {commitHash.slice(0, 7)}
				</Text>
			</Link>
		</Inline>

		<Inline gap="lg" align="center" wrap>
			<Link href="https://t128n.dev" target="_blank" rel="noreferrer">
				t128n.dev
			</Link>
			<Text variant="caption" tone="secondary">
				© 2026 Torben Haack
			</Text>
		</Inline>
	</Inline>
</footer>

<style>
	.app-footer {
		padding: var(--space-lg) 0;
		border-top: var(--border-width) solid var(--color-border);
	}

	.app-footer__divider {
		width: var(--border-width);
		height: var(--space-md);
		background: var(--color-border);
	}

	:global(.app-footer__mono) {
		font-family: var(--font-family-mono);
	}
</style>
