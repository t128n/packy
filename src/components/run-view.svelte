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
		prepare: "Preparing workspace…",
		install: "Downloading dependencies…",
		patch: "Preparing manifest…",
		pack: "Creating archive…",
		capture: "Reading archive…",
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
		waiting: "Pending",
		active: "Running",
		done: "Complete",
		failed: "Failed",
	};

	const statusClasses: Record<StageStatus, string> = {
		waiting: "text-body-secondary",
		active: "text-primary",
		done: "text-success",
		failed: "text-danger",
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

<div class="table-responsive">
	<table class="table table-sm align-middle mb-3">
		<thead>
			<tr>
				<th scope="col">Step</th>
				<th scope="col">Status</th>
				<th scope="col">Details</th>
			</tr>
		</thead>
		<tbody aria-live="polite">
			{#each stages as item (item.id)}
				{@const status = statusFor(item.id)}
				<tr>
					<td>{item.label}</td>
					<td>
						{#if status === "active"}
							<span
								class="d-inline-flex align-items-center gap-2 text-primary"
							>
								<Spinner size="sm" />
								{statusLabels[status]}
							</span>
						{:else}
							<span class={statusClasses[status]}>
								{statusLabels[status]}
							</span>
						{/if}
					</td>
					<td class="small text-body-secondary">
						{#if status === "active" && stage}
							{operations[stage]}
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

{#if error}
	<div class="alert alert-danger" role="alert">
		<h3 class="alert-heading h6">{stageLabel(error.stage)} failed</h3>
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

{#if log.trim().length > 0}
	<details>
		<summary class="small text-body-secondary">Technical details</summary>
		<pre class="app-log mt-2"><code>{log}</code></pre>
	</details>
{/if}
