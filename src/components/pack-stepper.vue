<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";

import StepBundleView from "~/components/step-bundle-view.vue";
import StepDownloadView from "~/components/step-download-view.vue";
import StepSelectView from "~/components/step-select-view.vue";
import type {
	BundleMeta,
	BundleResult,
	PackageRef,
	SelectAdvancePayload,
} from "~/lib/packy";

type Step = "select" | "bundle" | "download";

const currentStep = ref<Step>("select");
const selectedPackages = ref<PackageRef[]>([]);
const bundleMeta = ref<BundleMeta>({
	name: "",
	version: "",
	method: "slim-bundle",
});
const bundleResult = ref<BundleResult | null>(null);
const devMode = ref(false);
const stepPosition = ref<HTMLElement | null>(null);
const stepAnnouncement = ref("");

const stepDefinitions = [
	{
		value: "select" as const,
		title: "Select packages",
		description: "Choose packages and versions.",
	},
	{
		value: "bundle" as const,
		title: "Bundle",
		description: "Build the tarball in the browser.",
	},
	{
		value: "download" as const,
		title: "Download",
		description: "Save and install the archive.",
	},
];

const mockPackages: PackageRef[] = [
	{ name: "lodash", version: "4.17.21" },
	{ name: "axios", version: "1.6.0" },
	{ name: "vue", version: "3.5.32" },
];

const mockBundleMeta: BundleMeta = {
	name: "dev-bundle",
	version: "1.0.0",
	method: "slim-bundle",
};

const mockBundleResult: BundleResult = {
	name: "dev-bundle",
	version: "1.0.0",
	filename: "dev-bundle-1.0.0.tgz",
	url: "#",
	output: "Mock bundling process completed successfully.\n\nInstalled packages:\n- lodash@4.17.21\n- axios@1.6.0\n- vue@3.5.32\n\nBundle created at: dev-bundle-1.0.0.tgz",
	size: 4_312_678,
};

const currentIndex = computed(() =>
	stepDefinitions.findIndex((step) => step.value === currentStep.value),
);

const steps = computed(() =>
	stepDefinitions.map((step, index) => {
		const status =
			index < currentIndex.value
				? { label: "Done", role: "success" }
				: index === currentIndex.value
					? { label: "Current", role: "progress" }
					: { label: "Waiting", role: "neutral" };

		return {
			...step,
			current: index === currentIndex.value,
			status,
		};
	}),
);

const positionLabel = computed(
	() =>
		`Step ${currentIndex.value + 1} of ${stepDefinitions.length} · ${
			stepDefinitions[currentIndex.value]?.title ?? ""
		}`,
);

async function focusStepPosition() {
	await nextTick();
	stepPosition.value?.focus();
}

function handleSelectAdvance(payload: SelectAdvancePayload) {
	selectedPackages.value = payload.packages;
	bundleMeta.value = {
		name: payload.bundleName,
		version: payload.bundleVersion,
		method: payload.bundleMethod,
	};
	bundleResult.value = null;
	currentStep.value = "bundle";
	stepAnnouncement.value = "";
	void focusStepPosition();
}

function handleBundleReady(payload: BundleResult) {
	bundleResult.value = payload;
	currentStep.value = "download";
	stepAnnouncement.value =
		"Bundle complete. The archive is ready to download.";
	void focusStepPosition();
}

function handlePackMorePackages() {
	selectedPackages.value = [];
	bundleMeta.value = {
		name: "",
		version: "",
		method: "slim-bundle",
	};
	bundleResult.value = null;
	currentStep.value = "select";
	stepAnnouncement.value = "";
	void focusStepPosition();
}

function handleDownloadUrlRevoke(url: string) {
	if (url) {
		URL.revokeObjectURL(url);
	}
}

function resetDevMode() {
	selectedPackages.value = [];
	bundleMeta.value = {
		name: "",
		version: "",
		method: "slim-bundle",
	};
	bundleResult.value = null;
	currentStep.value = "select";
	stepAnnouncement.value = "";
	void focusStepPosition();
}

function skipToBundle() {
	selectedPackages.value = mockPackages;
	bundleMeta.value = mockBundleMeta;
	bundleResult.value = null;
	currentStep.value = "bundle";
	stepAnnouncement.value = "";
	void focusStepPosition();
}

function skipToDownload() {
	selectedPackages.value = mockPackages;
	bundleMeta.value = mockBundleMeta;
	bundleResult.value = mockBundleResult;
	currentStep.value = "download";
	stepAnnouncement.value = "";
	void focusStepPosition();
}

onMounted(() => {
	const params = new URLSearchParams(window.location.search);
	devMode.value = params.has("devMode");
});
</script>

<template>
	<div class="page-flow">
		<header class="page-header">
			<div>
				<h1>Bundle npm packages</h1>
				<p>
					Create a tarball for offline or air-gapped installs, with
					every dependency packed in the browser.
				</p>
			</div>
			<p ref="stepPosition" class="page-header__position" tabindex="-1">
				{{ positionLabel }}
			</p>
		</header>

		<p class="sr-only" aria-live="polite">{{ stepAnnouncement }}</p>

		<div class="t128n-stack">
			<div v-if="devMode" class="dev-bar">
				<div class="dev-bar__label">
					<span class="status status--warning">Dev mode</span>
					<span>Quick navigation with mock data.</span>
				</div>
				<div class="toolbar__group">
					<button
						class="button button--secondary"
						type="button"
						@click="resetDevMode"
					>
						Reset
					</button>
					<button
						class="button button--secondary"
						type="button"
						@click="skipToBundle"
					>
						Skip to bundle
					</button>
					<button
						class="button button--secondary"
						type="button"
						@click="skipToDownload"
					>
						Skip to download
					</button>
				</div>
			</div>

			<nav aria-label="Bundle progress">
				<ol class="steps">
					<li
						v-for="(step, index) in steps"
						:key="step.value"
						class="step"
						:aria-current="step.current ? 'step' : undefined"
					>
						<span class="step__index">{{ index + 1 }}</span>
						<span class="step__text">
							<span class="step__label">{{ step.title }}</span>
							<span class="step__description">{{
								step.description
							}}</span>
						</span>
						<span
							class="status"
							:class="`status--${step.status.role}`"
							>{{ step.status.label }}</span
						>
					</li>
				</ol>
			</nav>

			<StepSelectView
				v-if="currentStep === 'select'"
				@advance="handleSelectAdvance"
			/>

			<StepBundleView
				v-else-if="currentStep === 'bundle'"
				:packages="selectedPackages"
				:bundle-name="bundleMeta.name"
				:bundle-version="bundleMeta.version"
				:bundle-method="bundleMeta.method"
				@ready="handleBundleReady"
				@restart="handlePackMorePackages"
			/>

			<StepDownloadView
				v-else-if="currentStep === 'download' && bundleResult"
				:result="bundleResult"
				:bundle-method="bundleMeta.method"
				@pack-more-packages="handlePackMorePackages"
				@dispose-url="handleDownloadUrlRevoke"
			/>
		</div>
	</div>
</template>
