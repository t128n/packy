<script setup lang="ts">
import { computed, onMounted } from "vue";

import { useWebcontainer } from "~/composables/use-webcontainer";

const webcontainer = useWebcontainer();

const logoSrc = computed(() => {
	if (webcontainer.pending.value) {
		return "/packy_waking_up.svg";
	}

	if (webcontainer.error.value) {
		return "/packy_sad.svg";
	}

	if (webcontainer.ready.value) {
		return "/packy_happy.svg";
	}

	return "/packy_sleep.svg";
});

const hasWebcontainerError = computed(() => Boolean(webcontainer.error.value));

const webcontainerErrorMessage = computed(() => {
	const error = webcontainer.error.value;
	if (error instanceof Error) {
		return error.message;
	}

	return error ? String(error) : "";
});

	onMounted(() => {
		if (!crossOriginIsolated) {
			webcontainer.error.value = new Error(
				"Cross-origin isolation is required to start WebContainers.",
			);
			console.error(
				"WebContainers require cross-origin isolation. Restart the Vite server with COOP/COEP headers enabled.",
			);
			return;
	}

	void webcontainer.init();
});
</script>

<template>
	<UHeader title="packy">
		<template #title>
			<div class="flex items-center gap-2">
				<img :src="logoSrc" alt="" class="mt-1 h-14 w-auto" />
				<div class="flex flex-col">
					<span class="font-semibold">packy</span>
					<span class="text-muted text-xs font-medium"
						>frictionless dependency bundling</span
					>
				</div>
			</div>
		</template>
	</UHeader>
	<UModal
		v-if="hasWebcontainerError"
		:open="true"
		:dismissible="false"
		:modal="true"
		title="WebContainers unavailable"
		description="packy needs a cross-origin isolated browser environment to run WebContainers."
		:close="false"
	>
		<template #body>
			<p class="text-sm text-muted">
				{{ webcontainerErrorMessage || "Unable to start the in-browser runtime." }}
			</p>
			<p class="text-sm text-muted mt-3">
				Open this site from a deployment that sends COOP and COEP headers, or let the service worker reload the page once it has been registered.
			</p>
		</template>
	</UModal>
	<HeroBackground />
</template>
