<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";

import type { BundleMethod, BundleResult } from "~/lib/packy";
import { formatBytes } from "~/lib/packy";

const props = defineProps<{
	result: BundleResult;
	bundleMethod: BundleMethod;
}>();

const emit = defineEmits<{
	disposeUrl: [url: string];
	packMorePackages: [];
}>();

const copied = ref(false);
const copyFailed = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

const downloadLabel = computed(
	() =>
		props.result.filename ||
		`${props.result.name}-${props.result.version}.tgz`,
);

const methodLabel = computed(() =>
	props.bundleMethod === "slim-bundle" ? "Slim bundle" : "Full bundle",
);

const manualInstallCommand = computed(
	() => `npm install ./packages/${downloadLabel.value}`,
);

function resetCopyState() {
	copied.value = false;
	copyFailed.value = false;

	if (copyTimer) {
		clearTimeout(copyTimer);
	}
}

async function copyToClipboard(text: string) {
	resetCopyState();

	try {
		await navigator.clipboard.writeText(text);
		copied.value = true;
		copyTimer = setTimeout(resetCopyState, 4000);
	} catch {
		copyFailed.value = true;
	}
}

onBeforeUnmount(() => {
	if (copyTimer) {
		clearTimeout(copyTimer);
	}

	if (props.result.url) {
		emit("disposeUrl", props.result.url);
	}
});
</script>

<template>
	<section class="t128n-record" aria-labelledby="download-title">
		<aside class="t128n-record__meta">
			<div class="record-identity">
				<h2 class="headline-md">{{ result.name }}</h2>
				<p class="mono">{{ result.version }}</p>
			</div>

			<dl class="key-value">
				<div>
					<dt>Method</dt>
					<dd>{{ methodLabel }}</dd>
				</div>
				<div>
					<dt>Archive</dt>
					<dd class="mono">{{ downloadLabel }}</dd>
				</div>
				<div>
					<dt>Archive size</dt>
					<dd class="numeric">{{ formatBytes(result.size) }}</dd>
				</div>
			</dl>
		</aside>

		<div class="t128n-record__body">
			<header class="record-header">
				<div>
					<h2 id="download-title" class="headline-md">
						Bundle ready
					</h2>
					<p>
						Download the archive, then install it in the offline
						environment.
					</p>
				</div>
				<span class="status status--success">Complete</span>
			</header>

			<div class="actions">
				<a
					v-if="result.url"
					class="button button--primary"
					:href="result.url"
					:download="downloadLabel"
				>
					Download {{ downloadLabel }}
				</a>
				<span v-else class="button button--primary" aria-disabled="true"
					>Archive unavailable</span
				>
				<button
					class="button button--secondary"
					type="button"
					@click="emit('packMorePackages')"
				>
					Start another bundle
				</button>
			</div>

			<section class="log-section" aria-labelledby="install-title">
				<div class="section-heading">
					<h2 id="install-title" class="headline-md">Install</h2>
					<p>
						Place the archive in a local packages directory, then
						install it with npm.
					</p>
				</div>

				<div class="code-row">
					<pre class="code-block">{{ manualInstallCommand }}</pre>
					<button
						class="button button--secondary"
						type="button"
						@click="copyToClipboard(manualInstallCommand)"
					>
						Copy command
					</button>
				</div>

				<p class="hint" role="status" aria-live="polite">
					<span v-if="copied">Copied install command.</span>
					<span v-else-if="copyFailed"
						>Could not copy. Select the command and copy it
						manually.</span
					>
					<span v-else
						>The command assumes the archive is saved in
						<code>./packages</code>.</span
					>
				</p>
			</section>

			<details v-if="result.output" class="row-details">
				<summary>Show build log</summary>
				<pre class="code-block" tabindex="0">{{ result.output }}</pre>
			</details>
		</div>
	</section>
</template>
