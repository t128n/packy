<script lang="ts">
	import { Inline, Link, Text } from "@t128n/ui";

	const links = [{ label: "t128n.dev", href: "https://t128n.dev" }];
</script>

<footer class="app-footer">
	<Inline justify="between" align="center" gap="lg" wrap>
		<Inline gap="xl" wrap>
			{#each links as link}
				<Link href={link.href} target="_blank" rel="noreferrer">
					{link.label}
				</Link>
			{/each}
		</Inline>
		<Text variant="body-sm" tone="muted">© 2026 Torben Haack</Text>
	</Inline>
</footer>

<style>
	.app-footer {
		padding: var(--space-lg) 0;
		border-top: var(--border-width) solid var(--color-border);
	}
</style>
