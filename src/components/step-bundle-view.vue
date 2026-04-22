<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

import { useWebcontainer } from "~/composables/use-webcontainer";

type PackageRef = {
	name: string;
	version: string;
};

type BundlePackageRef = PackageRef & {
	folder: string;
};

const props = defineProps<{
	packages: PackageRef[];
	bundleName: string;
	bundleVersion: string;
	bundleMethod: "slim-bundle" | "full-bundle";
}>();

const emit = defineEmits<{
	ready: [
		payload: {
			name: string;
			version: string;
			filename: string;
			url: string;
			output: string;
		},
	];
}>();

const webcontainer = useWebcontainer();
const running = ref(false);
const paused = ref(false);
const output = ref("");
const error = ref("");
const workspaceReady = ref(false);
const currentStage = ref<
	"idle" | "prepare" | "pack" | "capture" | "done" | "error"
>("idle");
const failedStage = ref<"prepare" | "pack" | "capture" | null>(null);
const workspacePreview = ref<any[]>([]);
const workspaceId = ref("");
const downloadUrl = ref("");
const downloadFilename = ref("");
const blobSize = ref(0);

// oxlint-disable-next-line no-control-regex: matches ANSI escape codes from npm output.
const ANSI_REGEX = new RegExp("\\u001B\\[[0-9;]*[A-Za-z]", "g");
const TARBALL_NOTICE_REGEX = /npm notice filename:\s*([^\s]+\.tgz)/i;
const TARBALL_LINE_REGEX = /^\s*([^\s]+\.tgz)\s*$/im;
const TARBALL_MATCH_REGEX = /([^\s]+\.tgz)/gi;

const isSlimSingle = computed(
	() => props.bundleMethod === "slim-bundle" && props.packages.length === 1,
);

const workspacePath = computed(() => `/workspace/${workspaceId.value}`);
const bundlePath = computed(() => `${workspacePath.value}/bundle`);
const slimSinglePath = computed(() =>
	isSlimSingle.value
		? `${bundlePath.value}/node_modules/${props.packages[0].name}`
		: "",
);
const bundlePackages = computed<BundlePackageRef[]>(() =>
	props.packages.map((pkg) => ({
		...pkg,
		folder:
			pkg.name
				.replace(/[^a-zA-Z0-9._-]+/g, "-")
				.replace(/^-+|-+$/g, "") || "package",
	})),
);

const selectedSummary = computed(() =>
	props.packages.map((pkg) => `${pkg.name}@${pkg.version}`).join(", "),
);

const stageOrder = ["prepare", "pack", "capture"] as const;

const pipelineStages = computed(() => {
	const activeIndex = stageOrder.indexOf(
		currentStage.value as (typeof stageOrder)[number],
	);
	const failedIndex = failedStage.value
		? stageOrder.indexOf(failedStage.value)
		: -1;

	return [
		{
			value: "prepare",
			title: "Prepare workspace",
			description: "Set up bundle directory.",
		},
		{
			value: "pack",
			title: "Installing packages",
			description: "Fetch and patch dependencies.",
		},
		{
			value: "capture",
			title: "Packing archive",
			description: "Create the tarball.",
		},
	].map((stage, index) => {
		const isFailed = failedIndex === index;
		const isActive =
			!isFailed &&
			activeIndex === index &&
			running.value &&
			!paused.value;
		const isPaused = !isFailed && stage.value === "pack" && paused.value;
		const isComplete =
			currentStage.value === "done" || (!isFailed && activeIndex > index);
		const isPending = !isActive && !isComplete && !isFailed && !isPaused;

		return {
			...stage,
			status: isFailed
				? "error"
				: isPaused
					? "warning"
					: isActive
						? "active"
						: isComplete
							? "complete"
							: "pending",
			icon: isActive
				? "i-lucide-loader-circle"
				: isPaused
					? "i-lucide-pause-circle"
					: isComplete
						? "i-lucide-check-circle"
						: isFailed
							? "i-lucide-circle-x"
							: "i-lucide-circle-dot",
			badge: isPaused
				? "Paused"
				: isActive
					? "In progress"
					: isComplete
						? "Done"
						: isFailed
							? "Failed"
							: "Waiting",
			ringClass: isActive
				? "border-primary/40 bg-primary/10 text-primary"
				: isPaused
					? "border-warning/40 bg-warning/10 text-warning"
					: isComplete
						? "border-success/40 bg-success/10 text-success"
						: isFailed
							? "border-error/40 bg-error/10 text-error"
							: "border-default bg-elevated text-muted",
			textClass: isActive
				? "text-primary"
				: isPaused
					? "text-warning"
					: isComplete
						? "text-success"
						: isFailed
							? "text-error"
							: "text-muted",
			lineClass:
				index < stageOrder.length - 1
					? isComplete || isActive || currentStage.value === "done"
						? "bg-success/60"
						: isFailed && failedIndex > index
							? "bg-error/60"
							: "bg-default"
					: "",
			iconClass: isActive ? "animate-spin" : "",
			bodyClass: isPending ? "opacity-80" : "",
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

function buildWorkspacePreview(packages: BundlePackageRef[]) {
	const archiveName = `${props.bundleName || "packy-bundle"}-${props.bundleVersion || "0.0.0"}.tgz`;

	if (isSlimSingle.value) {
		const pkg = packages[0];
		return [
			{
				label: workspaceId.value
					? `workspace/${workspaceId.value}/`
					: "workspace/",
				defaultExpanded: true,
				children: [
					{
						label: "bundle/",
						defaultExpanded: true,
						children: [
							{
								label: "node_modules/",
								defaultExpanded: true,
								children: [
									{
										label: `${pkg.name}/`,
										defaultExpanded: true,
										children: [
											{
												label: "package.json",
												icon: "i-vscode-icons-file-type-json",
											},
											{
												label: "node_modules/",
												icon: "i-lucide-folder",
											},
											{
												label: archiveName,
												icon: "i-lucide-archive",
											},
										],
									},
								],
							},
						],
					},
				],
			},
		];
	}

	return [
		{
			label: workspaceId.value
				? `workspace/${workspaceId.value}/`
				: "workspace/",
			defaultExpanded: true,
			children: [
				{
					label: "bundle/",
					defaultExpanded: true,
					children: [
						{
							label: "package.json",
							icon: "i-vscode-icons-file-type-json",
						},
						{
							label: "node_modules/",
							defaultExpanded: true,
							children: packages.map((pkg) => ({
								label: pkg.name,
								defaultExpanded: true,
								children: [
									{
										label: "package.json",
										icon: "i-vscode-icons-file-type-json",
									},
								],
							})),
						},
						{ label: archiveName, icon: "i-lucide-archive" },
					],
				},
			],
		},
	];
}

async function prepareWorkspace() {
	if (!props.packages.length) throw new Error("No packages selected");

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

	workspacePreview.value = buildWorkspacePreview(bundlePackages.value);
	workspaceReady.value = true;
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
	if (installCode !== 0)
		throw new Error(`npm install failed with exit code ${installCode}`);

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
			JSON.stringify(manifest, null, 2) + "\n",
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
	if (code !== 0) throw new Error(`npm pack failed with exit code ${code}`);
}

async function startBundling() {
	if (running.value) return;

	running.value = true;
	paused.value = false;
	error.value = "";
	downloadUrl.value = "";
	downloadFilename.value = "";
	blobSize.value = 0;
	output.value = "";
	workspaceReady.value = false;
	workspacePreview.value = [];

	try {
		await prepareWorkspace();
		await runPack();
		currentStage.value = "capture";

		// Check if paused before completing
		if (paused.value) {
			// Don't complete the bundling process
			return;
		}

		const packedFile =
			parseTarballName(output.value) ??
			`${props.bundleName || "packy-bundle"}-${props.bundleVersion || "0.0.0"}.tgz`;
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
		});
	} catch (cause) {
		failedStage.value = ["prepare", "pack", "capture"].includes(
			currentStage.value,
		)
			? (currentStage.value as "prepare" | "pack" | "capture")
			: null;
		currentStage.value = "error";
		error.value = cause instanceof Error ? cause.message : String(cause);
	} finally {
		if (!paused.value) {
			running.value = false;
		}
	}
}

onMounted(() => {
	startBundling();
});
</script>

<template>
	<UCard>
		<template #header>
			<div class="space-y-1">
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<h2 class="mt-2 text-xl font-semibold">Bundle</h2>
					</div>
				</div>
				<p class="text-muted truncate text-sm">{{ selectedSummary }}</p>
			</div>
		</template>

		<div class="space-y-6">
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="space-y-3">
					<div
						v-for="(stage, index) in pipelineStages"
						:key="stage.value"
						class="grid grid-cols-[auto_1fr] gap-3"
					>
						<div class="flex flex-col items-center">
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full border text-sm"
								:class="stage.ringClass"
							>
								<UIcon
									:name="stage.icon"
									class="shrink-0"
									:class="stage.iconClass"
								/>
							</div>
							<div
								v-if="index < pipelineStages.length - 1"
								class="my-2 w-px flex-1 rounded-full"
								:class="stage.lineClass"
							/>
						</div>

						<div class="min-w-0 pb-3" :class="stage.bodyClass">
							<div class="flex flex-wrap items-center gap-2">
								<p class="font-medium" :class="stage.textClass">
									{{ stage.title }}
								</p>
								<UBadge
									:color="
										stage.status === 'complete'
											? 'success'
											: stage.status === 'active'
												? 'primary'
												: stage.status === 'warning'
													? 'warning'
													: stage.status === 'error'
														? 'error'
														: 'neutral'
									"
									variant="soft"
									size="xs"
								>
									{{ stage.badge }}
								</UBadge>
							</div>
							<p class="text-muted mt-1 text-sm">
								{{ stage.description }}
							</p>
						</div>
					</div>
				</div>

				<pre
					class="relative max-h-80 overflow-auto rounded-lg border border-gray-700 bg-black p-4 font-mono text-xs whitespace-pre-wrap text-green-400 before:absolute before:top-2 before:left-4 before:rounded before:bg-black before:px-2 before:py-1 before:text-xs before:text-gray-500"
					>{{ output || "Waiting for output…" }}</pre
				>
			</div>
		</div>

		<!-- Error (when failed) -->
		<div
			v-if="currentStage === 'error'"
			class="border-error/30 bg-error/10 mt-6 rounded-lg border p-4"
		>
			<div class="min-w-0">
				<p class="text-error">{{ error }}</p>
			</div>
			<UButton color="error" variant="soft" @click="startBundling">
				Retry
			</UButton>
		</div>
	</UCard>
</template>
