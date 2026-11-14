<script lang="ts">
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

	const statusAttributes: Record<StageStatus, string | undefined> = {
		waiting: undefined,
		active: "info",
		done: "ok",
		failed: "error",
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

<div class="app-table-scroll">
	<table>
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
							<span aria-busy="true" data-status="info">
								{statusLabels[status]}
							</span>
						{:else}
							<span
								class={status === "waiting" ? "app-muted" : undefined}
								data-status={statusAttributes[status]}
							>
								{statusLabels[status]}
							</span>
						{/if}
					</td>
					<td class="app-muted">
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
	<aside role="alert" data-status="error">
		<h3>{stageLabel(error.stage)} failed</h3>
		<p>{guidance?.message}</p>
		{#if error.exitCode !== undefined}
			<p class="app-muted"><small>Exit code {error.exitCode}</small></p>
		{/if}
		<menu>
			<li>
				<button
					type="button"
					class={inputError ? undefined : "app-primary"}
					onclick={onRetry}>Retry</button
				>
			</li>
			{#if onReset}
				<li>
					<button
						type="button"
						class={inputError ? "app-primary" : undefined}
						onclick={onReset}>Edit package or version</button
					>
				</li>
			{/if}
		</menu>
	</aside>
{/if}

{#if log.trim().length > 0}
	<details>
		<summary>Technical details</summary>
		<pre class="app-log"><code>{log}</code></pre>
	</details>
{/if}
