<script setup lang="ts">
import AppContainer from "~/components/app-container.vue";
import AppFooter from "~/components/app-footer.vue";
import AppHeader from "~/components/app-header.vue";
import AppMain from "~/components/app-main.vue";
import PackStepper from "~/components/pack-stepper.vue";
</script>

<template>
	<UApp>
		<div class="flex min-h-screen flex-col">
			<AppHeader />
			<AppMain>
				<AppContainer>
					<div class="space-y-6 py-8 sm:py-12">
						<PackStepper />
					</div>
				</AppContainer>
			</AppMain>

			<AppFooter />
		</div>
	</UApp>
</template>
