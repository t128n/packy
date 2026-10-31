<script lang="ts">
	import {
		Alert,
		AppShell,
		Container,
		Inline,
		Page,
		PageHeader,
		Section,
		Stack,
		Text,
	} from "@t128n/ui";
	import { onDestroy, onMount } from "svelte";

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

	const runtime = createWebContainerRuntime();

	let phase = $state<Phase>("idle");
	let reference = $state<PackageReference | null>(null);
	let stage = $state<RunStage | null>(null);
	let log = $state("");
	let failure = $state<RunFailure | null>(null);
	let result = $state<RunResult | null>(null);
	let downloadUrl = $state<string | null>(null);
	let crossOriginIsolated = $state(true);

	onMount(() => {
		crossOriginIsolated = Boolean(globalThis.crossOriginIsolated);
	});

	onDestroy(() => {
		revokeDownloadUrl();
	});

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
		phase = "running";
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

			result = run;
			log = run.log;
			stage = null;
			phase = "done";
			downloadUrl = URL.createObjectURL(
				new Blob([run.bytes as BlobPart], {
					type: "application/gzip",
				}),
			);
		} catch (cause) {
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
		}
	}

	function retry() {
		if (reference !== null) {
			void start(reference);
		}
	}

	function reset() {
		revokeDownloadUrl();
		phase = "idle";
		reference = null;
		stage = null;
		log = "";
		failure = null;
		result = null;
	}

	function download() {
		if (downloadUrl === null || result === null) {
			return;
		}

		const link = document.createElement("a");
		link.href = downloadUrl;
		link.download = result.filename;
		link.rel = "noreferrer";
		document.body.append(link);
		link.click();
		link.remove();
	}
</script>

<div class="app-frame">
	<AppShell>
		{#snippet navbar()}
			<AppNavbar />
		{/snippet}

		<Page gap="2xl">
			<PageHeader
				title="Offline npm bundles"
				description="Turn one npm package reference into a single tarball that installs without registry access."
			/>

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

			{#if phase === "idle"}
				<Section
					title="Package"
					description="Search the npm registry and choose one version. The archive keeps npm's resolved identity."
				>
					<PackagePicker
						disabled={!crossOriginIsolated}
						disabledReason="Cross-origin isolation is required to build an archive."
						onStart={start}
					/>
				</Section>
			{:else if phase === "running" || phase === "error"}
				<Section
					title="Archive"
					description={reference
						? `${phase === "error" ? "Build failed for" : "Building"} ${reference.name}@${reference.versionSpec}.`
						: phase === "error"
							? "The build failed."
							: "Building the archive."}
				>
					<RunView
						{stage}
						{log}
						error={failure}
						running={phase === "running"}
						onRetry={retry}
						onReset={reset}
					/>
				</Section>
			{:else if result !== null}
				<Section
					title="Archive"
					description="The archive is ready. Download it and install it offline."
				>
					<ResultView
						{result}
						{downloadUrl}
						onDownload={download}
						onReset={reset}
					/>
				</Section>
			{/if}

			{#if reference !== null && phase !== "idle" && phase !== "done"}
				<Inline align="center" gap="sm" wrap>
					<Text variant="body-sm" tone="secondary">
						Selected package
					</Text>
					<Text variant="body-sm">
						{reference.name}@{reference.versionSpec}
					</Text>
				</Inline>
			{/if}

			<Stack gap="sm">
				<Text variant="body-sm" tone="muted">
					One package per archive. npm resolves its dependency tree
					inside an isolated WebContainer; lifecycle scripts never run
					during archiving.
				</Text>
			</Stack>
		</Page>
	</AppShell>

	<Container width="content" padding="xl">
		<AppFooter />
	</Container>
</div>
