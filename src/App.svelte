<script lang="ts">
	import { onDestroy, onMount, tick } from "svelte";

	import AppNavbar from "~/components/app-navbar.svelte";
	import PackagePicker from "~/components/package-picker.svelte";
	import ResultView from "~/components/result-view.svelte";
	import RunView from "~/components/run-view.svelte";
	import WorkflowStepper from "~/components/workflow-stepper.svelte";
	import Alert from "~/components/ui/alert.svelte";
	import PageHeader from "~/components/ui/page-header.svelte";
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

	let pageTitle = $derived.by(() => {
		if (phase === "running") {
			return reference
				? `Building ${reference.name}@${reference.versionSpec}`
				: "Building your bundle";
		}

		if (phase === "error") {
			return "Bundle could not be created";
		}

		if (phase === "done") {
			return "Bundle ready";
		}

		return "Create an offline bundle";
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

<a class="skip-link" href="#main">Skip to main content</a>

<div class="app-frame">
	<AppNavbar />

	<main id="main" tabindex="-1" class="app-main">
		<div class="page">
			<PageHeader title={pageTitle} />

			<WorkflowStepper {phase} />

			<div class="app-state">
				{#if !crossOriginIsolated}
					<Alert
						tone="warning"
						title="Cross-origin isolation is not active yet"
					>
						packy needs cross-origin isolation to run WebContainers.
						If this message stays after a reload, serve the site with
						COOP and COEP headers or check that the service worker is
						allowed to load.
					</Alert>
				{/if}

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
					<div
						bind:this={workflowRegion}
						tabindex="-1"
						class="workflow-focus"
					>
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
					<div
						bind:this={workflowRegion}
						tabindex="-1"
						class="workflow-focus"
					>
						<ResultView
							{result}
							{downloadUrl}
							{downloadError}
							onDownload={download}
							onReset={reset}
						/>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
