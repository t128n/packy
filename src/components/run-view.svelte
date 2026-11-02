<script lang="ts">
	import Checkmark from "~icons/carbon/checkmark";
	import Close from "~icons/carbon/close";

	import Alert from "~/components/ui/alert.svelte";
	import Button from "~/components/ui/button.svelte";
	import Collapsible from "~/components/ui/collapsible.svelte";
	import Progress from "~/components/ui/progress.svelte";
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
	const operations: Record<RunStage, string> = { prepare: "Preparing a workspace…", install: "Downloading the package and its dependencies…", patch: "Preparing the package for offline installation…", pack: "Creating the archive…", capture: "Reading the completed archive…" };

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

<div class="run-view">
	<ol class="stage-list" aria-live="polite">
		{#each stages as item, index (item.id)}
			{@const status = statusFor(item.id)}
			<li class="stage" data-status={status}>
				<span class="stage__marker" aria-hidden="true">
					{#if status === "done"}
						<Checkmark />
					{:else if status === "failed"}
						<Close />
					{:else}
						<span class="stage__number">
							{String(index + 1).padStart(2, "0")}
						</span>
					{/if}
				</span>
				<span class="stage__label">{item.label}</span>
				<span class="stage__status">{statusLabels[status]}</span>
			</li>
		{/each}
	</ol>

	{#if running}
		<Progress
			value={null}
			label={stage ? operations[stage] : "Starting the build…"}
		/>
	{/if}

	{#if error}
		<Alert tone="danger" title={`${stageLabel(error.stage)} failed`}>
			<div class="stage-error">
				<p class="stage-error__message">{guidance?.message}</p>
				{#if error.exitCode !== undefined}
					<p class="stage-error__meta">Exit code {error.exitCode}</p>
				{/if}
				<div class="stage-error__actions">
					<Button
						variant={inputError ? "secondary" : "primary"}
						onclick={onRetry}
					>
						Retry
					</Button>
					{#if onReset}
						<Button
							variant={inputError ? "primary" : "link"}
							onclick={onReset}
						>
							Edit package or version
						</Button>
					{/if}
				</div>
			</div>
		</Alert>
	{/if}

	{#if log.trim().length === 0}
		<p class="run-view__empty">No output yet.</p>
	{:else}
		<Collapsible title="Build log">
			<pre class="code-block"><code>{log}</code></pre>
		</Collapsible>
	{/if}
</div>

<style>
	.run-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.stage-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: var(--border-width) solid var(--color-border-subtle);
	}

	.stage {
		display: grid;
		grid-template-columns: var(--icon-sm) minmax(0, 1fr) auto;
		gap: var(--space-3);
		align-items: center;
		padding: var(--space-2) 0;
		border-bottom: var(--border-width) solid var(--color-border-subtle);
	}

	.stage[data-status="active"] {
		padding-inline: var(--space-2);
		background: var(--color-surface);
	}

	.stage__marker {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
	}

	.stage__marker :global(svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	.stage[data-status="active"] .stage__marker {
		color: var(--color-primary);
	}

	.stage[data-status="done"] .stage__marker {
		color: var(--color-success);
	}

	.stage[data-status="failed"] .stage__marker {
		color: var(--color-error);
	}

	.stage__number {
		font-family: var(--font-mono);
		font-size: var(--font-size-caption);
		font-variant-numeric: tabular-nums;
	}

	.stage__label {
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.stage__label,
	.stage__status {
		min-width: 0;
	}

	.stage__status {
		color: var(--color-text-muted);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
		text-align: right;
	}

	.stage[data-status="active"] .stage__status {
		color: var(--color-primary);
	}

	.stage[data-status="done"] .stage__status {
		color: var(--color-success);
	}

	.stage[data-status="failed"] .stage__status {
		color: var(--color-error);
	}

	.stage-error {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.stage-error__message {
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.stage-error__meta {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.stage-error__actions {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.run-view__empty {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.code-block {
		max-height: var(--layout-code-max);
		margin: 0;
		padding: var(--space-3);
		overflow: auto;
		border: var(--border-width) solid var(--color-border-subtle);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-mono);
		line-height: var(--font-leading-mono);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
</style>
