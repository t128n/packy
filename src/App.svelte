<script lang="ts">
	import { Container } from "sveltestrap";
	import { onDestroy, onMount, tick } from "svelte";

	import AppFooter from "~/components/app-footer.svelte";
	import AppNavbar from "~/components/app-navbar.svelte";
	import PackagePicker from "~/components/package-picker.svelte";
	import ResultView from "~/components/result-view.svelte";
	import RunView from "~/components/run-view.svelte";
	import { isRunError } from "~/lib/core/errors";
	import { createLogBuffer } from "~/lib/core/log";
	import { runBundle } from "~/lib/core/run";
	import type {
		PackageReference,
		RunResult,
		RunStage,
	} from "~/lib/core/types";
	import { createWebContainerRuntime } from "~/lib/runtime/webcontainer";

	type Phase = "idle" | "running" | "done" | "error";

	type RunFailure = {
		stage: RunStage;
		message: string;
		exitCode?: number;
	};

	const stageLabels: Record<RunStage, string> = {
		prepare: "Preparing a workspace",
		install: "Installing the package",
		patch: "Preparing the manifest",
		pack: "Creating the archive",
		capture: "Reading the archive",
	};

	const runtime = createWebContainerRuntime();

	let phase = $state<Phase>("idle");
	let pickerKey = $state(0);
	let reference = $state<PackageReference | null>(null);
	let stage = $state<RunStage | null>(null);
	let log = $state("");
	let failure = $state<RunFailure | null>(null);
	let result = $state<RunResult | null>(null);
	let downloadUrl = $state<string | null>(null);
	let downloadError = $state("");
	let crossOriginIsolated = $state(true);
	let workflowRegion = $state<HTMLElement>();
	let pickerRegion = $state<HTMLElement>();
	let destroyed = false;

	let statusMessage = $derived.by(() => {
		if (phase === "running") {
			return stage
				? `${stageLabels[stage]} in progress.`
				: "Starting the build.";
		}

		if (phase === "done" && result) {
			return `Bundle ready: ${result.name}@${result.version}.`;
		}

		if (phase === "error") {
			return failure
				? `Build failed at ${stageLabels[failure.stage].toLowerCase()}.`
				: "The build failed.";
		}

		return "";
	});

	onMount(() => {
		crossOriginIsolated = Boolean(globalThis.crossOriginIsolated);
	});

	onDestroy(() => {
		destroyed = true;
		revokeDownloadUrl();
	});

	async function focusWorkflow() {
		await tick();
		if (!destroyed) workflowRegion?.focus();
	}

	async function focusPicker() {
		await tick();
		if (!destroyed) pickerRegion?.querySelector<HTMLInputElement>("input")?.focus();
	}

	function revokeDownloadUrl() {
		if (downloadUrl !== null) {
			URL.revokeObjectURL(downloadUrl);
			downloadUrl = null;
		}
	}

	function resetLog() {
		log = "";
	}

	async function start(next: PackageReference) {
		if (phase === "running") {
			return;
		}

		reference = next;
		downloadError = "";
		phase = "running";
		void focusWorkflow();
		stage = null;
		failure = null;
		result = null;
		revokeDownloadUrl();
		resetLog();

		const liveLog = createLogBuffer();

		try {
			const run = await runBundle({
				runtime,
				reference: next,
				onStage(nextStage) {
					stage = nextStage;
				},
				onLog(chunk) {
					liveLog.append(chunk);
					log = liveLog.text();
				},
			});

			if (destroyed) return;
			result = run;
			log = run.log;
			stage = null;
			phase = "done";
			downloadUrl = URL.createObjectURL(
				new Blob([run.bytes as BlobPart], {
					type: "application/gzip",
				}),
			);
			void focusWorkflow();
		} catch (cause) {
			if (destroyed) return;
			if (isRunError(cause)) {
				failure = {
					stage: cause.stage,
					message: cause.message,
					exitCode: cause.exitCode,
				};
				log = cause.log ?? liveLog.text();
				stage = cause.stage;
			} else {
				failure = {
					stage: "prepare",
					message:
						cause instanceof Error
							? cause.message
							: String(cause),
				};
				stage = "prepare";
			}

			phase = "error";
			void focusWorkflow();
		}
	}

	function retry() {
		if (reference !== null) {
			void start(reference);
		}
	}

	function editConfiguration() {
		phase = "idle";
		failure = null;
		void focusPicker();
	}

	function reset() {
		pickerKey += 1;
		revokeDownloadUrl();
		phase = "idle";
		reference = null;
		stage = null;
		log = "";
		failure = null;
		result = null;
		downloadError = "";
		void focusPicker();
	}

	function download() {
		if (downloadUrl === null || result === null) {
			return;
		}

		downloadError = "";
		const link = document.createElement("a");
		try {
			link.href = downloadUrl;
			link.download = result.filename;
			link.rel = "noreferrer";
			document.body.append(link);
			link.click();
		} catch {
			downloadError = "The download could not be started. Check your browser’s download settings and try again.";
		} finally {
			link.remove();
		}
	}
</script>

<div class="d-flex min-vh-100 flex-column">
	<AppNavbar />

	<main class="flex-grow-1 py-4">
		<Container class="app-container">
			<div class="visually-hidden" aria-live="polite" aria-atomic="true">
				{statusMessage}
			</div>

			{#if !crossOriginIsolated}
				<div class="alert alert-warning" role="alert">
					<h4 class="alert-heading">
						Cross-origin isolation is not active yet
					</h4>
					<p class="mb-0">
						packy needs cross-origin isolation to run WebContainers. If
						this message stays after a reload, serve the site with COOP and
						COEP headers or check that the service worker is allowed to
						load.
					</p>
				</div>
			{/if}

			<header class="mb-4">
				<h1 class="h2 mb-2">Create an offline npm bundle</h1>
				<p class="lead mb-2">
					Bundle one npm package and its dependencies into a downloadable
					archive for offline installation. Everything runs in your browser.
				</p>
				<p class="small text-body-secondary mb-0">
					Creating a bundle requires registry access. Installing the archive
					does not.
				</p>
			</header>

			<section id="bundle" aria-labelledby="bundle-heading" class="mb-5">
				<h2 id="bundle-heading" class="h4">Bundle</h2>

				<div hidden={phase !== "idle"} bind:this={pickerRegion}>
					{#key pickerKey}
						<PackagePicker
							disabled={!crossOriginIsolated}
							disabledReason="Cross-origin isolation is required to build an archive."
							onStart={start}
						/>
					{/key}
				</div>

				{#if phase === "running" || phase === "error"}
					<div bind:this={workflowRegion} tabindex="-1" class="workflow-focus">
						<h3 class="h5">
							{phase === "error" ? "Build failed" : "Building bundle"}
						</h3>
						{#if reference}
							<p class="text-body-secondary">
								<code>{reference.name}@{reference.versionSpec}</code>
							</p>
						{/if}
						<RunView
							{stage}
							{log}
							error={failure}
							running={phase === "running"}
							onRetry={retry}
							onReset={editConfiguration}
						/>
					</div>
				{:else if result !== null}
					<div bind:this={workflowRegion} tabindex="-1" class="workflow-focus">
						<h3 class="h5">Bundle ready</h3>
						<ResultView
							{result}
							{downloadUrl}
							{downloadError}
							onDownload={download}
							onReset={reset}
						/>
					</div>
				{/if}
			</section>

			<section
				id="how-it-works"
				aria-labelledby="how-it-works-heading"
				class="border-top pt-4"
			>
				<h2 id="how-it-works-heading" class="h4">How it works</h2>
				<p>
					Packy loads the selected package and its dependencies from npm,
					prepares an archive that can be installed without registry access,
					and keeps the package’s resolved dependency tree inside it.
				</p>
				<p class="mb-0">
					Installing the archive does not need npm. Native binaries and
					packages that depend on install scripts may still require extra
					preparation, so verify each archive before relying on it offline.
				</p>
			</section>
		</Container>
	</main>

	<AppFooter />
</div>
