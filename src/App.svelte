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
		install: "Downloading dependencies",
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
	let helpOpen = $state(true);
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

		const revealHelp = () => {
			if (location.hash === "#how-it-works") {
				helpOpen = true;
			}
		};

		revealHelp();
		window.addEventListener("hashchange", revealHelp);

		return () => {
			window.removeEventListener("hashchange", revealHelp);
		};
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

	async function showHelp() {
		helpOpen = true;
		await tick();
		document.getElementById("how-it-works")?.scrollIntoView();
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
		helpOpen = false;
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
		helpOpen = true;
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
		helpOpen = true;
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

<a class="visually-hidden-focusable" href="#main">Skip to main content</a>

<div class="d-flex min-vh-100 flex-column">
	<AppNavbar onShowHelp={showHelp} />

	<main id="main" tabindex="-1" class="flex-grow-1 py-3">
		<Container fluid class="px-3 px-lg-4">
			<div class="visually-hidden" aria-live="polite" aria-atomic="true">
				{statusMessage}
			</div>

			{#if !crossOriginIsolated}
				<div class="alert alert-warning" role="alert">
					<h2 class="alert-heading h5">
						Cross-origin isolation is not active yet
					</h2>
					<p class="mb-0">
						packy needs cross-origin isolation to run WebContainers. If
						this message stays after a reload, serve the site with COOP and
						COEP headers or check that the service worker is allowed to
						load.
					</p>
				</div>
			{/if}

			<header class="mb-3">
				<h1 id="page-title" class="h2 mb-1">Create bundle</h1>
				<p class="text-body-secondary mb-0">
					Bundle one npm package for offline installation.
				</p>
			</header>

			<section id="bundle" aria-labelledby="page-title" class="mb-4">
				<div hidden={phase !== "idle"} bind:this={pickerRegion}>
					{#key pickerKey}
						<PackagePicker
							disabled={!crossOriginIsolated}
							disabledReason="Cross-origin isolation is required to build an archive."
							onStart={start}
							onSelect={() => {
								helpOpen = false;
							}}
						/>
					{/key}
				</div>

				{#if phase === "running" || phase === "error"}
					<div bind:this={workflowRegion} tabindex="-1" class="workflow-focus">
						<h2 class="h4">
							{phase === "error" ? "Build failed" : "Building bundle"}
						</h2>
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
						<h2 class="h4">Bundle ready</h2>
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

			<details
				id="how-it-works"
				class="border-top pt-3"
				bind:open={helpOpen}
			>
				<summary class="fw-semibold">How it works and offline notes</summary>
				<div class="app-prose small text-body-secondary mt-2">
					<p>
						Packy downloads the selected package and its dependencies from
						npm, then packs them into one archive. Building needs registry
						access; installing the archive does not.
					</p>
					<p class="mb-0">
						Install scripts are disabled in both steps. Native binaries and
						packages that require install scripts may need additional
						preparation before they work offline.
					</p>
				</div>
			</details>
		</Container>
	</main>

	<AppFooter />
</div>
