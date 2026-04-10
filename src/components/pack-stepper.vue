<script setup lang="ts">
import type { StepperItem } from "@nuxt/ui";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const currentStep = ref<"select" | "bundle" | "download">("select");
const selectedPackages = ref<Array<{ name: string; version: string }>>([]);
const bundleMeta = ref({ name: "", version: "" });
const bundleResult = ref({
	name: "",
	version: "",
	filename: "",
	url: "",
	output: "",
});
const devMode = ref(false);
const isXlAndUp = ref(false);
let mediaQuery: MediaQueryList | null = null;
let updateOrientation: (() => void) | null = null;

const stepperOrientation = computed(() =>
	isXlAndUp.value ? "vertical" : "horizontal",
);

const baseItems = [
	{
		value: "select" as const,
		slot: "select" as const,
		title: "Select",
		description: "Choose packages",
		icon: "i-lucide:package-search",
	},
	{
		value: "bundle" as const,
		slot: "bundle" as const,
		title: "Bundle",
		description: "Bundle packages into tarball",
		icon: "i-lucide:package-open",
	},
	{
		value: "download" as const,
		slot: "download" as const,
		title: "Download",
		description: "Download tarball",
		icon: "i-lucide:file-down",
	},
] satisfies StepperItem[];

// Mock data for devMode
const mockPackages = [
	{ name: "lodash", version: "4.17.21" },
	{ name: "axios", version: "1.6.0" },
	{ name: "vue", version: "3.5.32" },
];

const mockBundleMeta = {
	name: "dev-bundle",
	version: "1.0.0",
};

const mockBundleResult = {
	name: "dev-bundle",
	version: "1.0.0",
	filename: "dev-bundle-1.0.0.tgz",
	url: "#",
	output: "Mock bundling process completed successfully!\n\nInstalled packages:\n- lodash@4.17.21\n- axios@1.6.0\n- vue@3.5.32\n\nBundle created at: dev-bundle-1.0.0.tgz",
};

const items = computed(() => {
	const currentIndex = baseItems.findIndex(
		(item) => item.value === currentStep.value,
	);
	return baseItems.map((item, index) => ({
		...item,
		disabled: devMode.value
			? false
			: index > currentIndex ||
				(currentStep.value === "download" && index === 1),
	}));
});

function handleSelectAdvance(payload: {
	packages: Array<{ name: string; version: string }>;
	bundleName: string;
	bundleVersion: string;
}) {
	selectedPackages.value = payload.packages;
	bundleMeta.value = {
		name: payload.bundleName,
		version: payload.bundleVersion,
	};
	currentStep.value = "bundle";
}

function handleBundleReady(payload: {
	name: string;
	version: string;
	filename: string;
	url: string;
	output: string;
}) {
	bundleResult.value = payload;
	currentStep.value = "download";
}

function handlePackMorePackages() {
	selectedPackages.value = [];
	bundleMeta.value = { name: "", version: "" };
	bundleResult.value = {
		name: "",
		version: "",
		filename: "",
		url: "",
		output: "",
	};
	currentStep.value = "select";
}

function handleDownloadUrlRevoke(url: string) {
	if (url) {
		URL.revokeObjectURL(url);
	}
}

// DevMode functions
function skipToBundle() {
	selectedPackages.value = mockPackages;
	bundleMeta.value = mockBundleMeta;
	currentStep.value = "bundle";
}

function skipToDownload() {
	selectedPackages.value = mockPackages;
	bundleMeta.value = mockBundleMeta;
	bundleResult.value = mockBundleResult;
	currentStep.value = "download";
}

function resetToSelect() {
	handlePackMorePackages();
}

onMounted(() => {
	mediaQuery = window.matchMedia("(min-width: 1280px)");
	updateOrientation = () => {
		isXlAndUp.value = mediaQuery?.matches ?? false;
	};

	updateOrientation();
	mediaQuery.addEventListener("change", updateOrientation);
	window.addEventListener("resize", updateOrientation);

	// Check for devMode query parameter
	const urlParams = new URLSearchParams(window.location.search);
	devMode.value = urlParams.has("devMode");

	if (devMode.value) {
		// Pre-populate with mock data for easier testing
		selectedPackages.value = mockPackages;
		bundleMeta.value = mockBundleMeta;
	}
});

onBeforeUnmount(() => {
	if (mediaQuery && updateOrientation) {
		mediaQuery.removeEventListener("change", updateOrientation);
		window.removeEventListener("resize", updateOrientation);
	}
});
</script>

<template>
	<UCard variant="outline" class="z-10">
		<template #header v-if="devMode">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<UBadge color="warning" variant="soft">
						<UIcon name="i-lucide-zap" class="mr-1 h-4 w-4" />
						Dev Mode
					</UBadge>
					<span class="text-muted text-sm"
						>Quick navigation enabled</span
					>
				</div>
				<div class="flex gap-2">
					<UButton
						size="xs"
						variant="ghost"
						color="neutral"
						@click="resetToSelect"
					>
						Reset
					</UButton>
					<UButton
						size="xs"
						variant="ghost"
						color="primary"
						@click="skipToBundle"
					>
						Skip to Bundle
					</UButton>
					<UButton
						size="xs"
						variant="ghost"
						color="success"
						@click="skipToDownload"
					>
						Skip to Download
					</UButton>
				</div>
			</div>
		</template>

		<UStepper
			v-model="currentStep"
			:linear="!devMode"
			:orientation="stepperOrientation"
			:items="items"
			class="w-full gap-6"
		>
			<template #select>
				<StepSelectView @advance="handleSelectAdvance" />
			</template>
			<template #bundle>
				<StepBundleView
					v-if="currentStep === 'bundle'"
					:packages="selectedPackages"
					:bundle-name="bundleMeta.name"
					:bundle-version="bundleMeta.version"
					@ready="handleBundleReady"
				/>
			</template>
			<template #download>
				<StepDownloadView
					v-if="currentStep === 'download'"
					:bundle-name="bundleResult.name || bundleMeta.name"
					:bundle-version="bundleResult.version || bundleMeta.version"
					:filename="bundleResult.filename"
					:url="bundleResult.url"
					:output="bundleResult.output"
					@pack-more-packages="handlePackMorePackages"
					@dispose-url="handleDownloadUrlRevoke"
				/>
			</template>
		</UStepper>
	</UCard>
</template>
