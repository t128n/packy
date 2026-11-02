<script lang="ts">
	import { AppMark, Icon, Inline, Link, Text, appRegistry } from "@t128n/ui";
	import LogoGithub from "~icons/carbon/logo-github";
	import Moon from "~icons/carbon/moon";
	import Sun from "~icons/carbon/sun";

	import { getTheme, toggleTheme, type Theme } from "~/lib/theme";

	let theme = $state<Theme>(getTheme());

	function changeTheme() {
		theme = toggleTheme();
	}
</script>

<header class="app-navbar">
	<div class="app-navbar__inner">
		<a class="brand" href="/" aria-label="packy home">
			<AppMark app={appRegistry.packy} size="sm" label={null} />
			<Text variant="label" as="span" weight="medium">packy</Text>
		</a>

		<span class="app-navbar__divider" aria-hidden="true"></span>
		<Text variant="caption" tone="secondary" class="app-navbar__context">
			Offline npm bundles
		</Text>

		<span class="app-navbar__spacer"></span>

		<nav aria-label="Main">
			<Inline gap="sm" align="center">
				<Link
					href="https://github.com/t128n/packy"
					variant="ghost"
					target="_blank"
					rel="noreferrer"
					aria-label="GitHub repository"
				>
					<Inline gap="xs" align="center">
						<Icon icon={LogoGithub} size={16} />
						<Text
							variant="label"
							tone="inherit"
							as="span"
							class="app-navbar__link-label"
						>
							GitHub
						</Text>
					</Inline>
				</Link>

				<button
					class="icon-control"
					type="button"
					aria-label={theme === "dark"
						? "Switch to light theme"
						: "Switch to dark theme"}
					title={theme === "dark"
						? "Switch to light theme"
						: "Switch to dark theme"}
					onclick={changeTheme}
				>
					<Icon icon={theme === "dark" ? Sun : Moon} size={20} />
				</button>
			</Inline>
		</nav>
	</div>
</header>

<style>
	.app-navbar {
		border-bottom: var(--border-width) solid var(--color-border);
		background: var(--color-workspace);
		color: var(--color-text-primary);
	}

	.app-navbar__inner {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		min-height: calc(var(--control-height) + var(--space-sm) * 2);
		padding: 0 var(--space-xl);
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

	.app-navbar__divider {
		width: var(--border-width);
		height: var(--space-lg);
		background: var(--color-border);
	}

	:global(.app-navbar__context) {
		font-family: var(--font-family-mono);
		letter-spacing: var(--font-tracking-caps);
		text-transform: uppercase;
	}

	.app-navbar__spacer {
		flex: 1;
	}

	.icon-control {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--touch-target);
		height: var(--touch-target);
		padding: 0;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	@media (hover: hover) and (pointer: fine) {
		.icon-control:hover {
			background: var(--color-surface-subtle);
			color: var(--color-text-primary);
		}
	}

	.icon-control:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-focus);
		outline-offset: var(--space-xs);
	}

	@media (max-width: 800px) {
		.app-navbar__inner {
			padding: 0 var(--space-lg);
		}

		.app-navbar__divider,
		:global(.app-navbar__context) {
			display: none;
		}
	}

	@media (max-width: 640px) {
		:global(.app-navbar__link-label) {
			display: none;
		}
	}
</style>
