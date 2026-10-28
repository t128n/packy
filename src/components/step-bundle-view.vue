<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";

import { useWebcontainer } from "~/composables/use-webcontainer";
import type { BundleMethod, BundleResult, PackageRef } from "~/lib/packy";
import { formatBytes } from "~/lib/packy";

type StageValue = "prepare" | "pack" | "capture";

const props = defineProps<{
	packages: PackageRef[];
	bundleName: string;
	bundleVersion: string;
	bundleMethod: BundleMethod;
}>();

const emit = defineEmits<{
	ready: [payload: BundleResult];
	restart: [];
}>();

const webcontainer = useWebcontainer();
const running = ref(false);
const output = ref("");
const error = ref("");
const currentStage = ref<"idle" | StageValue | "done" | "error">("idle");
const failedStage = ref<StageValue | null>(null);
const workspaceId = ref("");
const downloadUrl = ref("");
const downloadFilename = ref("");
const blobSize = ref(0);
const logElement = ref<HTMLElement | null>(null);

// oxlint-disable-next-line no-control-regex: matches ANSI escape codes from npm output.
const ANSI_REGEX = new RegExp("\\u001B\\[[0-9;]*[A-Za-z]", "g");
const TARBALL_NOTICE_REGEX = /npm notice filename:\s*([^\s]+\.tgz)/i;
const TARBALL_LINE_REGEX = /^\s*([^\s]+\.tgz)\s*$/im;
const TARBALL_MATCH_REGEX = /([^\s]+\.tgz)/gi;
const INVALID_NAME_REGEX = /[^a-zA-Z0-9._-]+/g;
const SCOPE_PREFIX_REGEX = /^@/;
const SCOPE_SEPARATOR_REGEX = /\//g;
const INVALID_FILENAME_REGEX = /[^a-zA-Z0-9._-]+/g;
const EDGE_DASH_REGEX = /^-+|-+$/g;

const isSlimSingle = computed(
	() => props.bundleMethod === "slim-bundle" && props.packages.length === 1,
);

const workspacePath = computed(() => `/workspace/${workspaceId.value}`);
const bundlePath = computed(() => `${workspacePath.value}/bundle`);
const slimSinglePath = computed(() =>
	isSlimSingle.value
		? `${bundlePath.value}/node_modules/${props.packages[0]?.name}`
		: "",
);
const bundlePackages = computed(() =>
	props.packages.map((pkg) => ({
		...pkg,
		folder:
			pkg.name
				.replace(INVALID_NAME_REGEX, "-")
				.replace(EDGE_DASH_REGEX, "") || "package",
	})),
);

const selectedSummary = computed(() =>
	props.packages.map((pkg) => `${pkg.name}@${pkg.version}`).join(", "),
);

const methodLabel = computed(() =>
	props.bundleMethod === "slim-bundle" ? "Slim bundle" : "Full bundle",
);

const expectedFilename = computed(() =>
	packFilename(
		props.bundleName || "packy-bundle",
		props.bundleVersion || "0.0.0",
	),
);

function packFilename(name: string, version: string) {
	const normalizedName =
		name
			.replace(SCOPE_PREFIX_REGEX, "")
			.replace(SCOPE_SEPARATOR_REGEX, "-")
			.replace(INVALID_FILENAME_REGEX, "-") || "packy-bundle";
	const normalizedVersion =
		version.replace(INVALID_FILENAME_REGEX, "-") || "0.0.0";

	return `${normalizedName}-${normalizedVersion}.tgz`;
}

const recordStatus = computed(() => {
	if (currentStage.value === "error") {
		return { label: "Failed", role: "danger" };
	}

	if (currentStage.value === "done") {
		return { label: "Complete", role: "success" };
	}

	if (running.value) {
		return { label: "In progress", role: "progress" };
	}

	return { label: "Waiting", role: "neutral" };
});

const stageOrder: StageValue[] = ["prepare", "pack", "capture"];

const stageAnnouncement = computed(() => {
	if (!running.value || currentStage.value === "error") {
		return "";
	}

	const stage = pipelineStages.value.find(
		(item) => item.status.role === "progress",
	);

	return stage ? `${stage.title} in progress.` : "";
});

const pipelineStages = computed(() => {
	const activeIndex = stageOrder.indexOf(currentStage.value as StageValue);
	const failedIndex = failedStage.value
		? stageOrder.indexOf(failedStage.value)
		: -1;

	return [
		{
			value: "prepare" as const,
			title: "Prepare workspace",
			description: "Write the bundle manifest in the in-browser runtime.",
		},
		{
			value: "pack" as const,
			title: "Install and pack",
			description:
				"Fetch dependencies, then create the tarball with npm.",
		},
		{
			value: "capture" as const,
			title: "Capture archive",
			description: "Read the tarball and prepare the download.",
		},
	].map((stage, index) => {
		const hasFailed = failedIndex >= 0;
		const isFailed = failedIndex === index;
		const isSkipped = hasFailed && index > failedIndex;
		const isComplete =
			currentStage.value === "done" ||
			(!isFailed &&
				!isSkipped &&
				(hasFailed ? index < failedIndex : activeIndex > index));
		const isActive =
			!isFailed && !isSkipped && activeIndex === index && running.value;
		const status = isFailed
			? { label: "Failed", role: "danger" }
			: isSkipped
				? { label: "Skipped", role: "neutral" }
				: isComplete
					? { label: "Done", role: "success" }
					: isActive
						? { label: "In progress", role: "progress" }
						: { label: "Waiting", role: "neutral" };

		return {
			...stage,
			status,
		};
	});
});

function appendOutput(chunk: string) {
	output.value += chunk;
}

function stripAnsi(input: string) {
	return input.replace(ANSI_REGEX, "").replace(/\r/g, "");
}

function parseTarballName(stdout: string) {
	const out = stripAnsi(stdout);

	const notice = out.match(TARBALL_NOTICE_REGEX);
	if (notice?.[1]) return notice[1];

	const line = out.match(TARBALL_LINE_REGEX);
	if (line?.[1]) return line[1];

	const matches = Array.from(
		out.matchAll(TARBALL_MATCH_REGEX),
		(match) => match[1],
	);
	return matches.at(-1) ?? null;
}

function createWorkspaceId() {
	return (
		globalThis.crypto?.randomUUID?.() ??
		`${Date.now()}-${Math.random().toString(16).slice(2)}`
	)
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-");
}

function errorMessage(cause: unknown) {
	return cause instanceof Error ? cause.message : String(cause);
}

async function prepareWorkspace() {
	if (!props.packages.length) {
		throw new Error("No packages were selected.");
	}

	currentStage.value = "prepare";
	failedStage.value = null;
	workspaceId.value = createWorkspaceId();

	const dependencies = Object.fromEntries(
		bundlePackages.value.map((pkg) => [pkg.name, pkg.version]),
	);
	const pkgJson = {
		name: props.bundleName || "packy-bundle",
		version: props.bundleVersion || "0.0.0",
		private: true,
		description: `packy bundle for ${selectedSummary.value}`,
		license: "UNLICENSED",
		dependencies,
		bundleDependencies: props.packages.map((pkg) => pkg.name),
		scripts: {
			prepare: "echo skip-prepare",
			prepack: "echo skip-prepack",
			postpack: "echo skip-postpack",
			install: "echo skip-install",
			postinstall: "echo skip-postinstall",
		},
	};

	await webcontainer.init();
	await webcontainer.write({
		workspace: {
			directory: {
				[workspaceId.value]: {
					directory: {
						bundle: {
							directory: {
								"package.json": {
									file: {
										contents: JSON.stringify(
											pkgJson,
											null,
											2,
										),
									},
								},
							},
						},
					},
				},
			},
		},
	});
}

async function runPack() {
	currentStage.value = "pack";
	appendOutput("$ npm install\n");

	const install = await webcontainer.exec(
		"npm",
		["install", "--ignore-scripts", "--install-strategy=nested"],
		{
			cwd: bundlePath.value,
			env: {
				npm_config_fund: "false",
				npm_config_audit: "false",
				npm_config_progress: "false",
			},
			output(chunk) {
				appendOutput(chunk);
			},
		},
	);

	const installCode = await install.exit;
	if (installCode !== 0) {
		throw new Error(`npm install failed with exit code ${installCode}.`);
	}

	// Patch each selected package's package.json with bundleDependencies so
	// npm pack recursively includes their nested node_modules in the tarball.
	const fs = webcontainer.container.value!.fs;
	for (const pkg of bundlePackages.value) {
		const manifestPath = `${bundlePath.value}/node_modules/${pkg.name}/package.json`;
		const raw = await fs.readFile(manifestPath, "utf-8");
		const manifest = JSON.parse(raw as string);
		const deps = [
			...Object.keys(manifest.dependencies ?? {}),
			...Object.keys(manifest.optionalDependencies ?? {}),
		];
		manifest.bundleDependencies = deps;
		manifest.bundledDependencies = deps;
		manifest.scripts = {
			...manifest.scripts,
			prepare: "echo skip-prepare",
			prepack: "echo skip-prepack",
			postpack: "echo skip-postpack",
			install: "echo skip-install",
			postinstall: "echo skip-postinstall",
			prepublish: "echo skip-prepublish",
			publish: "echo skip-publish",
			postpublish: "echo skip-postpublish",
			preinstall: "echo skip-preinstall",
			pretest: "echo skip-pretest",
			test: "echo skip-test",
			posttest: "echo skip-posttest",
		};
		await fs.writeFile(
			manifestPath,
			`${JSON.stringify(manifest, null, 2)}\n`,
		);
	}

	appendOutput("$ npm pack\n");

	const pack = await webcontainer.exec("npm", ["pack", "--ignore-scripts"], {
		cwd: isSlimSingle.value ? slimSinglePath.value : bundlePath.value,
		env: {
			npm_config_ignore_scripts: "true",
			npm_config_fund: "false",
			npm_config_audit: "false",
			npm_config_progress: "false",
		},
		output(chunk) {
			appendOutput(chunk);
		},
	});

	const code = await pack.exit;
	if (code !== 0) {
		throw new Error(`npm pack failed with exit code ${code}.`);
	}
}

async function startBundling(focusLog = false) {
	if (running.value) {
		return;
	}

	running.value = true;
	error.value = "";
	if (downloadUrl.value) {
		URL.revokeObjectURL(downloadUrl.value);
	}
	downloadUrl.value = "";
	downloadFilename.value = "";
	blobSize.value = 0;
	output.value = "";
	failedStage.value = null;

	if (focusLog) {
		await nextTick();
		logElement.value?.focus();
	}

	try {
		await prepareWorkspace();
		await runPack();
		currentStage.value = "capture";

		const packedFile =
			parseTarballName(output.value) ?? expectedFilename.value;
		const tarball = await webcontainer.read(
			`${isSlimSingle.value ? slimSinglePath.value : bundlePath.value}/${packedFile}`,
			null,
		);
		const blob = new Blob([tarball as unknown as BlobPart], {
			type: "application/gzip",
		});
		downloadUrl.value = URL.createObjectURL(blob);
		downloadFilename.value = packedFile;
		blobSize.value = blob.size;
		currentStage.value = "done";
		emit("ready", {
			name: props.bundleName || "packy-bundle",
			version: props.bundleVersion || "0.0.0",
			filename: packedFile,
			url: downloadUrl.value,
			output: output.value,
			size: blob.size,
		});
	} catch (cause) {
		failedStage.value = stageOrder.includes(
			currentStage.value as StageValue,
		)
			? (currentStage.value as StageValue)
			: null;
		currentStage.value = "error";
		error.value = errorMessage(cause);
	} finally {
		running.value = false;
	}
}

onMounted(() => {
	void startBundling(false);
});
</script>

<template>
	<section class="t128n-record" aria-labelledby="bundle-title">
		<aside class="t128n-record__meta">
			<div class="record-identity">
				<h2 class="headline-md">{{ bundleName || "packy-bundle" }}</h2>
				<p class="mono">{{ bundleVersion || "0.0.0" }}</p>
			</div>

			<dl class="key-value">
				<div>
					<dt>Method</dt>
					<dd>{{ methodLabel }}</dd>
				</div>
				<div>
					<dt>Packages</dt>
					<dd class="numeric">
						{{ packages.length }}
					</dd>
				</div>
				<div>
					<dt>Archive</dt>
					<dd class="mono">
						{{ downloadFilename || expectedFilename }}
					</dd>
				</div>
				<div>
					<dt>Archive size</dt>
					<dd class="numeric">
						{{ formatBytes(blobSize || undefined) }}
					</dd>
				</div>
			</dl>
		</aside>

		<div class="t128n-record__body">
			<header class="record-header">
				<div>
					<h2 id="bundle-title" class="headline-md">
						Bundling packages
					</h2>
					<p>{{ selectedSummary }}</p>
				</div>
				<span class="status" :class="`status--${recordStatus.role}`">{{
					recordStatus.label
				}}</span>
			</header>

			<p class="sr-only" role="status" aria-live="polite">
				{{ stageAnnouncement }}
			</p>

			<ol class="pipeline" aria-label="Bundling stages">
				<li
					v-for="(stage, index) in pipelineStages"
					:key="stage.value"
					class="pipeline__item"
				>
					<span class="pipeline__index">{{ index + 1 }}</span>
					<span class="pipeline__text">
						<span class="pipeline__title">{{ stage.title }}</span>
						<span class="pipeline__description">{{
							stage.description
						}}</span>
					</span>
					<span
						class="status"
						:class="`status--${stage.status.role}`"
						>{{ stage.status.label }}</span
					>
				</li>
			</ol>

			<section class="log-section" aria-labelledby="log-title">
				<div class="section-heading">
					<h2 id="log-title" class="headline-md">Build log</h2>
					<p>Live npm output from the in-browser runtime.</p>
				</div>
				<pre ref="logElement" class="code-block" tabindex="0">{{
					output || "Waiting for npm output…"
				}}</pre>
			</section>

			<div v-if="error" class="notice notice--error" role="alert">
				<p><strong>Bundling failed.</strong> {{ error }}</p>
				<p>
					Retry keeps the selected packages and bundle settings. Check
					the build log, then retry, or start over to choose different
					packages.
				</p>
			</div>
			<div v-if="error" class="actions">
				<button
					class="button button--primary"
					type="button"
					@click="startBundling(true)"
				>
					Retry bundling
				</button>
				<button
					class="button button--secondary"
					type="button"
					@click="emit('restart')"
				>
					Start over
				</button>
			</div>
		</div>
	</section>
</template>
