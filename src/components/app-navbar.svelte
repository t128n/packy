<script lang="ts">
	import { Icon, Inline, Link, Navbar, Text } from "@t128n/ui";
	import LogoGithub from "~icons/carbon/logo-github";
</script>

<Navbar brand="packy" label="Main">
	{#snippet actions()}
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
	{/snippet}
</Navbar>
