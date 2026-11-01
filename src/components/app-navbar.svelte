<script lang="ts">
	import { AppMark, Icon, Inline, Link, Text, appRegistry } from "@t128n/ui";
	import LogoGithub from "~icons/carbon/logo-github";
</script>

<header class="app-navbar">
	<Inline justify="between" align="center" gap="lg">
		<a class="brand" href="/" aria-label="packy home">
			<AppMark app={appRegistry.packy} size="sm" label={null} />
			<Text variant="label" as="span" weight="medium">packy</Text>
		</a>

		<nav aria-label="Main">
			<Link
				href="https://github.com/t128n/packy"
				variant="ghost"
				target="_blank"
				rel="noreferrer"
			>
				<Inline gap="xs" align="center">
					<Icon icon={LogoGithub} size={16} />
					<Text variant="label" tone="inherit" as="span">GitHub</Text>
				</Inline>
			</Link>
		</nav>
	</Inline>
</header>

<style>
	.app-navbar {
		min-height: calc(var(--control-height) + var(--space-sm) * 2);
		padding: 0 var(--space-xl);
		border-bottom: var(--border-width) solid var(--color-border);
		background: var(--color-workspace);
		color: var(--color-text-primary);
		font-family: var(--font-family-sans);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		color: var(--color-text-primary);
		text-decoration: none;
	}

	.brand:focus-visible {
		border-radius: var(--radius-sm);
		outline: var(--border-width-emphasis) solid var(--color-focus);
		outline-offset: var(--space-xs);
	}
</style>
