<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";

import { useWebcontainer } from "~/composables/use-webcontainer";

type Theme = "system" | "light" | "dark";

const webcontainer = useWebcontainer();
const theme = ref<Theme>("system");

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

const runtimeStatus = computed(() => {
	if (webcontainer.error.value) {
		return { label: "Runtime unavailable", role: "danger" };
	}

	if (webcontainer.ready.value) {
		return { label: "Runtime ready", role: "success" };
	}

	if (webcontainer.pending.value) {
		return { label: "Starting runtime", role: "progress" };
	}

	return { label: "Runtime idle", role: "neutral" };
});

function applyTheme() {
	const root = document.documentElement;

	if (theme.value === "system") {
		root.removeAttribute("data-theme");
	} else {
		root.dataset.theme = theme.value;
	}

	try {
		localStorage.setItem("packy-theme", theme.value);
	} catch {
		// Storage can be unavailable in private browsing contexts.
	}
}

watch(theme, applyTheme);

onMounted(() => {
	try {
		const storedTheme = localStorage.getItem("packy-theme");
		if (
			storedTheme === "system" ||
			storedTheme === "light" ||
			storedTheme === "dark"
		) {
			theme.value = storedTheme;
		}
	} catch {
		// Keep the system theme when storage is unavailable.
	}

	applyTheme();

	if (!crossOriginIsolated) {
		webcontainer.error.value = new Error(
			"WebContainers need cross-origin isolation. Serve packy with COOP and COEP headers, then reload.",
		);
	}
});
</script>

<template>
	<header class="app-header">
		<div class="t128n-page">
			<div class="app-header__inner">
				<a class="app-brand" href="/">
					<img :src="logoSrc" alt="" width="28" height="28" />
					<span class="app-brand__text">
						<span class="app-brand__name">packy</span>
						<span class="app-brand__tagline"
							>Offline npm bundles</span
						>
					</span>
				</a>

				<div class="app-header__tools">
					<p class="runtime-status">
						<span
							class="status"
							:class="`status--${runtimeStatus.role}`"
							aria-live="polite"
							>{{ runtimeStatus.label }}</span
						>
					</p>
					<label class="theme-field">
						<span>Theme</span>
						<select v-model="theme" class="select">
							<option value="system">System</option>
							<option value="light">Light</option>
							<option value="dark">Dark</option>
						</select>
					</label>
				</div>
			</div>
		</div>
	</header>
</template>
