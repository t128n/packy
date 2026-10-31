<script lang="ts">
	import { Footer } from "@t128n/ui";

	const commitHash = __GIT_COMMIT_HASH__;
	const shortCommit = commitHash.slice(0, 7);
	const commitUrl = `https://github.com/t128n/packy/commit/${commitHash}`;

	const links = [
		{ label: "GitHub", href: "https://github.com/t128n/packy" },
		{ label: shortCommit, href: commitUrl },
		{ label: "t128n.dev", href: "https://t128n.dev" },
	];
</script>

<Footer
	brand="packy"
	{links}
	note="© 2026 Torben Haack · one package per archive"
/>
