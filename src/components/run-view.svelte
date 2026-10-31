<script lang="ts">
	import {
		Alert,
		Badge,
		Button,
		Code,
		Collapsible,
		Inline,
		Progress,
		Stack,
		Text,
	} from "@t128n/ui";

	import type { RunStage } from "../lib/core/types";

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

	type StageStatus = "waiting" | "active" | "done" | "failed";

	const stages: { id: RunStage; label: string }[] = [
		{ id: "prepare", label: "Prepare workspace" },
		{ id: "install", label: "Install package" },
		{ id: "patch", label: "Patch manifest" },
		{ id: "pack", label: "Pack archive" },
		{ id: "capture", label: "Capture archive" },
	];

	const statusLabels: Record<StageStatus, string> = {
		waiting: "Waiting",
		active: "In progress",
		done: "Done",
		failed: "Failed",
	};

	const statusTones = {
		waiting: "neutral",
		active: "progress",
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
	<Stack gap="sm" aria-live="polite">
		{#each stages as item (item.id)}
			{@const status = statusFor(item.id)}
			<Inline justify="between" align="center" gap="md">
				<Text variant="body-sm">{item.label}</Text>
				<Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>
			</Inline>
		{/each}
	</Stack>

	{#if running}
		<Progress value={null} label="Building the archive" />
	{/if}

	{#if error}
		<Alert tone="danger" title={`${stageLabel(error.stage)} failed`}>
			<Stack gap="sm" align="start">
				<Text variant="body-sm">{error.message}</Text>
				{#if error.exitCode !== undefined}
					<Text variant="body-sm" tone="secondary">
						Exit code {error.exitCode}
					</Text>
				{/if}
				<Inline gap="sm" wrap>
					<Button variant="secondary" onclick={onRetry}>
						Retry
					</Button>
					{#if onReset}
						<Button variant="link" onclick={onReset}>
							Change package
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
			{#snippet trigger()}Show npm output{/snippet}
			<Code block>{log}</Code>
		</Collapsible>
	{/if}
</Stack>
