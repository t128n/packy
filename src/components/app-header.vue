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

onMounted(() => {
	if (!crossOriginIsolated) {
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
	<HeroBackground />
</template>
