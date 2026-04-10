<script setup lang="ts">
import nodeModulesIcon from "~/assets/node-modules.svg?component";
import npmxIcon from "~/assets/npmx.svg?component";

const commitHash = __GIT_COMMIT_HASH__;
const commitUrl = `https://github.com/t128n/packy/commit/${commitHash}`;

const primaryStack = [
	{
		name: "WebContainers",
		url: "https://webcontainers.io",
		icon: "i-simple-icons:stackblitz",
	},
	{ name: "NPM", url: "https://www.npmjs.com/", icon: "i-simple-icons:npm" },
	{
		name: "Vue.js",
		url: "https://vuejs.org/",
		icon: "i-simple-icons:vuedotjs",
	},
	{ name: "Vite", url: "https://vitejs.dev/", icon: "i-simple-icons:vite" },
	{
		name: "Nuxt UI",
		url: "https://ui.nuxt.com/",
		icon: "i-simple-icons:nuxtdotjs",
	},
];

const additionalTools = [
	{ name: "npmx", url: "https://npmx.dev/", icon: npmxIcon },
	{
		name: "node-modules",
		url: "https://node-modules.dev/",
		icon: nodeModulesIcon,
	},
	{
		name: "pkg-size",
		url: "https://pkg-size.dev/",
		icon: "i-lucide:package-search",
	},
];
</script>

<template>
	<USeparator type="dashed" class="h-px" />

	<UFooter>
		<template #left>
			<div
				class="text-muted flex flex-wrap items-center gap-x-1 gap-y-1 text-sm"
			>
				<span>&copy; 2026 Torben Haack</span>
				<span>&sdot;</span>
				<a
					:href="commitUrl"
					target="_blank"
					rel="noreferrer"
					class="font-mono text-xs hover:underline"
					:title="commitHash"
					>{{ commitHash.slice(0, 7) }}
				</a>
			</div>
		</template>

		<template #right>
			<div class="flex flex-wrap items-center gap-1">
				<UButton
					icon="i-simple-icons:github"
					color="neutral"
					variant="ghost"
					to="https://github.com/t128n/packy"
					target="_blank"
					rel="noreferrer"
					aria-label="GitHub Repository"
					title="GitHub Repository"
				/>
				<UButton
					icon="i-lucide-globe"
					color="neutral"
					variant="ghost"
					to="https://t128.dev"
					target="_blank"
					rel="noreferrer"
					aria-label="Personal website"
					title="Personal website"
				/>
			</div>
		</template>

		<template #default>
			<div class="flex flex-col gap-1">
				<div
					class="text-muted flex flex-row flex-wrap items-center justify-center gap-1.5 text-xs"
				>
					<span>Powered by</span>
					<div
						v-for="(tech, index) in primaryStack"
						:key="tech.name"
						class="flex items-center"
					>
						<a
							:href="tech.url"
							target="_blank"
							rel="noreferrer"
							class="flex items-center hover:opacity-80"
							:aria-label="tech.name"
						>
							<UIcon :name="tech.icon" class="size-3" />
						</a>
						<span
							v-if="index < primaryStack.length - 1"
							class="ml-1.5"
							>,</span
						>
						<span v-else class="ml-1.5">.</span>
					</div>
				</div>

				<div
					class="text-muted flex flex-row flex-wrap items-center justify-center gap-1.5 text-xs"
				>
					<span>Enhanced by</span>
					<div
						v-for="(tool, index) in additionalTools"
						:key="tool.name"
						class="flex items-center"
					>
						<a
							:href="tool.url"
							target="_blank"
							rel="noreferrer"
							class="flex items-center hover:opacity-80"
							:aria-label="tool.name"
						>
							<UIcon :name="tool.icon" class="size-3" />
						</a>
						<span
							v-if="index < additionalTools.length - 1"
							class="ml-1.5"
							>,</span
						>
						<span v-else class="ml-1.5">.</span>
					</div>
				</div>

				<div class="text-muted flex justify-center text-xs">
					<span>Domain provided by</span>
					<a
						href="https://js.org/"
						target="_blank"
						rel="noreferrer"
						class="ml-1 inline-flex items-center gap-1 hover:underline"
					>
						<UIcon name="i-simple-icons:javascript" class="size-3" />
						.org
					</a>
				</div>
			</div>
		</template>
	</UFooter>
</template>
