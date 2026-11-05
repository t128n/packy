<script lang="ts">
	import { Button, Spinner } from "sveltestrap";

	import type { RunStage } from "../lib/core/types";
	import { describeFailure } from "../lib/ui/failure";

	type Props = {
		stage: RunStage | null;
		log: string;
		error: {
			stage: RunStage;
			message: string;
			exitCode?: number;
		} | null;
		running: boolean;
		onRetry: () => void;
		onReset?: () => void;
	};

	let { stage, log, error, running, onRetry, onReset }: Props = $props();
	let guidance = $derived(error ? describeFailure(error, log) : null);
	let inputError = $derived(guidance?.action === "edit");

	const operations: Record<RunStage, string> = {
		prepare: "Preparing a workspace…",
		install: "Downloading the package and its dependencies…",
		patch: "Preparing the package for offline installation…",
		pack: "Creating the archive…",
		capture: "Reading the completed archive…",
	};

	type StageStatus = "waiting" | "active" | "done" | "failed";

	const stages: { id: RunStage; label: string }[] = [
		{ id: "prepare", label: "Prepare workspace" },
		{ id: "install", label: "Install package" },
		{ id: "patch", label: "Patch manifest" },
		{ id: "pack", label: "Pack archive" },
		{ id: "capture", label: "Capture archive" },
	];

	const statusLabels: Record<StageStatus, string> = {
		waiting: "Not run",
		active: "In progress",
		done: "Done",
		failed: "Failed",
	};

	const statusColors = {
		waiting: "secondary",
		active: "primary",
		done: "success",
		failed: "danger",
	} as const;

	function stageIndex(id: RunStage): number {
		return stages.findIndex((candidate) => candidate.id === id);
	}

	function stageLabel(id: RunStage): string {
		return stages[stageIndex(id)]?.label ?? id;
	}

	function statusFor(id: RunStage): StageStatus {
		const index = stageIndex(id);

		if (error) {
			const failedIndex = stageIndex(error.stage);

			if (index < failedIndex) return "done";
			if (index === failedIndex) return "failed";
			return "waiting";
		}

		if (!stage) return "waiting";

		const activeIndex = stageIndex(stage);

		if (index < activeIndex) return "done";
		if (index === activeIndex) return running ? "active" : "done";
		return "waiting";
	}
</script>

<ol class="list-group list-group-flush mb-3" aria-live="polite">
	{#each stages as item (item.id)}
		{@const status = statusFor(item.id)}
		<li
			class="list-group-item d-flex align-items-center justify-content-between gap-2 px-0 py-2"
		>
			<span>{item.label}</span>
			{#if status === "active"}
				<span class="d-inline-flex align-items-center gap-2">
					<Spinner size="sm" />
					<span class="badge text-bg-{statusColors[status]}">
						{statusLabels[status]}
					</span>
				</span>
			{:else}
				<span class="badge text-bg-{statusColors[status]}">
					{statusLabels[status]}
				</span>
			{/if}
		</li>
	{/each}
</ol>

{#if running}
	<p class="small text-body-secondary" aria-live="polite">
		{stage ? operations[stage] : "Starting the build…"}
	</p>
{/if}

{#if error}
	<div class="alert alert-danger" role="alert">
		<h4 class="alert-heading">{stageLabel(error.stage)} failed</h4>
		<p>{guidance?.message}</p>
		{#if error.exitCode !== undefined}
			<p class="small text-body-secondary mb-2">Exit code {error.exitCode}</p>
		{/if}
		<div class="d-flex flex-wrap gap-2">
			<Button
				color={inputError ? "outline-secondary" : "primary"}
				on:click={onRetry}>Retry</Button
			>
			{#if onReset}
				<Button
					color={inputError ? "primary" : "link"}
					class={inputError ? "" : "p-0"}
					on:click={onReset}>Edit package or version</Button
				>
			{/if}
		</div>
	</div>
{/if}

{#if log.trim().length === 0}
	<p class="small text-body-secondary mb-0">No output yet.</p>
{:else}
	<details>
		<summary class="text-body-secondary">Technical details</summary>
		<pre class="app-log mt-2"><code>{log}</code></pre>
	</details>
{/if}
