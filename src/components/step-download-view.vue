<script setup lang="ts">
import { computed, onBeforeUnmount } from "vue";

const props = defineProps<{
	bundleName: string;
	bundleVersion: string;
	filename: string;
	url: string;
	output: string;
}>();

const emit = defineEmits<{
	disposeUrl: [url: string];
	packMorePackages: [];
}>();

const downloadLabel = computed(
	() =>
		props.filename ||
		`${props.bundleName || "bundle"}-${props.bundleVersion || "0.0.0"}.tgz`,
);
// Updated to a sensible default local directory
const manualInstallCommand = computed(
	() => `npm install ./packages/${downloadLabel.value}`,
);

const copyToClipboard = async (text: string) => {
	try {
		await navigator.clipboard.writeText(text);
	} catch (err) {
		console.error("Failed to copy:", err);
	}
};

onBeforeUnmount(() => {
	if (props.url) emit("disposeUrl", props.url);
});
</script>

<template>
	<UCard>
		<template #header>
			<div class="flex items-center gap-2">
				<h2 class="text-xl font-semibold">Install Bundle</h2>
			</div>
		</template>

		<div class="space-y-8">
			<section>
				<h3 class="mb-1 text-lg font-medium">1. Download</h3>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					Save the generated archive to your local environment.
				</p>
				<UButton
					as="a"
					color="primary"
					target="_self"
					icon="i-lucide-download"
					:href="url"
					:download="downloadLabel"
					:disabled="!url"
				>
					Download {{ downloadLabel }}
				</UButton>
			</section>

			<hr class="border-gray-200 dark:border-gray-800" />

			<section>
				<h3 class="mb-1 text-lg font-medium">2. Install</h3>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					Place the archive in a dedicated local directory (e.g.,
					<code class="rounded bg-gray-100 px-1 dark:bg-gray-800"
						>./packages</code
					>) and install it via npm.
				</p>

				<div
					class="mb-4 flex items-center justify-between gap-4 rounded-md border border-gray-200 bg-gray-100 p-3 dark:border-gray-800 dark:bg-gray-900"
				>
					<code
						class="overflow-x-auto font-mono text-sm whitespace-nowrap text-gray-800 dark:text-gray-200"
					>
						{{ manualInstallCommand }}
					</code>
					<UButton
						icon="i-lucide-copy"
						color="neutral"
						variant="ghost"
						@click="copyToClipboard(manualInstallCommand)"
						aria-label="Copy install command"
					/>
				</div>
			</section>
		</div>
	</UCard>
</template>
