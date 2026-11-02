<script lang="ts">
	import LogoGithub from "~icons/carbon/logo-github";
	import Moon from "~icons/carbon/moon";
	import Sun from "~icons/carbon/sun";

	import BrandMark from "~/components/ui/brand-mark.svelte";
	import { getTheme, toggleTheme, type Theme } from "~/lib/theme";

	let theme = $state<Theme>(getTheme());

	function changeTheme() {
		theme = toggleTheme();
	}
</script>

<header class="app-bar">
	<div class="app-bar__inner">
		<a class="brand" href="/" aria-label="packy home">
			<BrandMark size="sm" />
			<span class="brand__wordmark">packy</span>
		</a>

		<span class="app-bar__divider" aria-hidden="true"></span>
		<span class="app-bar__context">Offline npm bundles</span>

		<span class="app-bar__spacer"></span>

		<nav aria-label="Main">
			<div class="app-bar__actions">
				<a
					class="app-bar__link"
					href="https://github.com/t128n/packy"
					target="_blank"
					rel="noreferrer"
					aria-label="GitHub repository"
				>
					<LogoGithub />
					<span class="app-bar__link-label">GitHub</span>
				</a>

				<button
					class="icon-button"
					type="button"
					aria-label={theme === "dark"
						? "Switch to light theme"
						: "Switch to dark theme"}
					title={theme === "dark"
						? "Switch to light theme"
						: "Switch to dark theme"}
					onclick={changeTheme}
				>
					{#if theme === "dark"}
						<Sun />
					{:else}
						<Moon />
					{/if}
				</button>
			</div>
		</nav>
	</div>
</header>

<style>
	.app-bar {
		position: sticky;
		top: 0;
		z-index: var(--z-sticky);
		border-bottom: var(--border-width) solid var(--color-app-bar-divider);
		background: var(--color-app-bar);
		color: var(--color-app-bar-text);
	}

	.app-bar__inner {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		width: 100%;
		max-width: calc(
			var(--layout-shell) + var(--layout-page-padding) +
				var(--layout-page-padding)
		);
		min-height: var(--layout-app-bar);
		margin-inline: auto;
		padding-inline: var(--layout-page-padding);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-accent-on-dark);
		text-decoration: none;
	}

	.brand__wordmark {
		color: var(--color-accent-on-dark);
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-none);
		letter-spacing: var(--font-tracking-heading-md);
	}

	.app-bar__divider {
		width: var(--border-width);
		height: var(--space-4);
		background: var(--color-app-bar-divider);
	}

	.app-bar__context {
		color: var(--color-app-bar-text-secondary);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		line-height: var(--font-leading-caption);
		letter-spacing: var(--font-tracking-caps);
		text-transform: uppercase;
	}

	.app-bar__spacer {
		flex: 1;
	}

	.app-bar__actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.app-bar__link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		height: var(--size-control-md);
		padding: 0 var(--space-2);
		border-radius: var(--radius-md);
		color: var(--color-app-bar-text-secondary);
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-medium);
		line-height: var(--font-leading-none);
		text-decoration: none;
	}

	.app-bar__link :global(svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	.app-bar__link:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-accent-on-dark);
		outline-offset: var(--space-1);
	}

	.icon-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--size-control-md);
		height: var(--size-control-md);
		padding: 0;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--color-app-bar-text-secondary);
		cursor: pointer;
	}

	.icon-button :global(svg) {
		width: var(--icon-md);
		height: var(--icon-md);
	}

	.icon-button:focus-visible {
		outline: var(--border-width-emphasis) solid var(--color-accent-on-dark);
		outline-offset: var(--space-1);
	}

	@media (hover: hover) and (pointer: fine) {
		.app-bar__link:hover,
		.icon-button:hover {
			background: var(--color-app-bar-raised);
			color: var(--color-app-bar-text);
		}
	}

	@media (max-width: 800px) {
		.app-bar__divider,
		.app-bar__context {
			display: none;
		}
	}

	@media (max-width: 639px) {
		.app-bar__link-label {
			display: none;
		}

		.app-bar__link {
			width: var(--size-control-md);
			justify-content: center;
			padding: 0;
		}
	}
</style>
