<script setup lang="ts">
const commitHash = __GIT_COMMIT_HASH__;
const commitUrl = `https://github.com/t128n/packy/commit/${commitHash}`;

const projectLinks = [
	{ label: "GitHub", url: "https://github.com/t128n/packy" },
	{ label: "t128n.dev", url: "https://t128n.dev" },
	{ label: "npmx", url: "https://npmx.dev/" },
	{ label: "node-modules", url: "https://node-modules.dev/" },
	{ label: "pkg-size", url: "https://pkg-size.dev/" },
	{ label: "Domain by js.org", url: "https://js.org/" },
];
</script>

<template>
	<footer class="app-footer">
		<div class="t128n-page">
			<div class="app-footer__inner">
				<p class="app-footer__meta">
					&copy; 2026 Torben Haack &middot;
					<a
						:href="commitUrl"
						target="_blank"
						rel="noreferrer"
						:title="commitHash"
					>
						<code>{{ commitHash.slice(0, 7) }}</code>
					</a>
				</p>

				<nav class="app-footer__links" aria-label="Project links">
					<a
						v-for="link in projectLinks"
						:key="link.url"
						:href="link.url"
						target="_blank"
						rel="noreferrer"
						>{{ link.label }}</a
					>
				</nav>

				<p class="app-footer__meta">
					Built with Vue, Vite, and WebContainers.
				</p>
			</div>
		</div>
	</footer>
</template>
