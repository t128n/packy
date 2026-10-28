<script setup lang="ts">
import AppFooter from "~/components/app-footer.vue";
import AppHeader from "~/components/app-header.vue";
import PackStepper from "~/components/pack-stepper.vue";
</script>

<template>
	<div class="app">
		<a class="skip-link" href="#main">Skip to content</a>
		<AppHeader />
		<main id="main" class="app-main" tabindex="-1">
			<div class="t128n-page">
				<PackStepper />
			</div>
		</main>
		<AppFooter />
	</div>
</template>
