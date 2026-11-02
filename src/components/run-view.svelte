<script lang="ts">
	import {
		Alert,
		Button,
		Code,
		Collapsible,
		Icon,
		Inline,
		Progress,
		Stack,
		Text,
	} from "@t128n/ui";
	import Checkmark from "~icons/carbon/checkmark";
	import Close from "~icons/carbon/close";

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

	const statusTones = {
		waiting: "muted",
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

<Stack gap="lg">
	<ol class="stage-list" aria-live="polite">
		{#each stages as item, index (item.id)}
			{@const status = statusFor(item.id)}
			<li class="stage" data-status={status}>
				<span class="stage__marker" aria-hidden="true">
					{#if status === "done"}
						<Icon icon={Checkmark} size={16} />
					{:else if status === "failed"}
						<Icon icon={Close} size={16} />
					{:else}
						<span class="stage__number">
							{String(index + 1).padStart(2, "0")}
						</span>
					{/if}
				</span>
				<Text
					variant="body-sm"
					weight={status === "active" ? "medium" : "regular"}
				>
					{item.label}
				</Text>
				<Text
					variant="body-sm"
					tone={statusTones[status]}
					class="stage__status"
				>
					{statusLabels[status]}
				</Text>
			</li>
		{/each}
	</ol>

	{#if running}
		<Progress value={null} label={stage ? operations[stage] : "Starting the build…"} />
	{/if}

	{#if error}
		<Alert tone="danger" title={`${stageLabel(error.stage)} failed`}>
			<Stack gap="sm" align="start">
				<Text variant="body-sm">{guidance?.message}</Text>
				{#if error.exitCode !== undefined}
					<Text variant="body-sm" tone="secondary">
						Exit code {error.exitCode}
					</Text>
				{/if}
				<Inline gap="sm" wrap>
					<Button variant={inputError ? "secondary" : "primary"} onclick={onRetry}>
						Retry
					</Button>
					{#if onReset}
						<Button variant={inputError ? "primary" : "link"} onclick={onReset}>
							Edit package or version
						</Button>
					{/if}
				</Inline>
			</Stack>
		</Alert>
	{/if}

	{#if log.trim().length === 0}
		<Text variant="body-sm" tone="secondary">No output yet.</Text>
	{:else}
		<Collapsible>
			{#snippet trigger()}Technical details{/snippet}
			<Code block class="build-log">{log}</Code>
		</Collapsible>
	{/if}
</Stack>

<style>
	.stage-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
		border-top: var(--border-width) solid var(--color-border);
	}

	.stage {
		display: grid;
		grid-template-columns: var(--icon-size-sm) minmax(0, 1fr) auto;
		gap: var(--space-md);
		align-items: center;
		padding: var(--space-sm) 0;
		border-bottom: var(--border-width) solid var(--color-border);
	}

	.stage[data-status="active"] {
		padding-inline: var(--space-sm);
		background: var(--color-surface-subtle);
	}

	.stage__marker {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-muted);
	}

	.stage[data-status="active"] .stage__marker {
		color: var(--color-accent);
	}

	.stage[data-status="done"] .stage__marker {
		color: var(--color-success);
	}

	.stage[data-status="failed"] .stage__marker {
		color: var(--color-danger);
	}

	.stage__number {
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		font-variant-numeric: tabular-nums;
	}

	:global(.stage__status) {
		text-align: right;
	}

	:global(.build-log) {
		max-height: var(--layout-log-max);
		overflow: auto;
	}
</style>
