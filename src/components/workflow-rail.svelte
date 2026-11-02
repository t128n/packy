<script lang="ts">
	import { Text } from "@t128n/ui";

	type Phase = "idle" | "running" | "done" | "error";
	type Status = "current" | "done" | "failed" | "pending";

	type Props = {
		phase: Phase;
	};

	let { phase }: Props = $props();

	const steps = [
		{ label: "Select", detail: "Choose one package" },
		{ label: "Build", detail: "Resolve and pack" },
		{ label: "Download", detail: "Install offline" },
	] as const;

	function statusFor(index: number): Status {
		if (phase === "idle") {
			return index === 0 ? "current" : "pending";
		}

		if (phase === "error") {
			if (index === 0) return "done";
			if (index === 1) return "failed";
			return "pending";
		}

		if (phase === "running") {
			if (index === 0) return "done";
			if (index === 1) return "current";
			return "pending";
		}

		return index === 2 ? "current" : "done";
	}

	function detailFor(status: Status, fallback: string): string {
		if (status === "done") return "Done";
		if (status === "failed") return "Failed";
		return fallback;
	}
</script>

<nav class="workflow" aria-label="Workflow">
	<ol class="workflow__list">
		{#each steps as step, index}
			{@const status = statusFor(index)}
			<li
				class="workflow__step"
				data-status={status}
				aria-current={status === "current" ? "step" : undefined}
			>
				<span class="workflow__number" aria-hidden="true">
					{String(index + 1).padStart(2, "0")}
				</span>
				<span class="workflow__body">
					<Text
						variant="label"
						as="span"
						tone={status === "pending" ? "secondary" : "primary"}
					>
						{step.label}
					</Text>
					<Text
						variant="caption"
						tone="secondary"
						as="span"
						class="workflow__detail"
					>
						{detailFor(status, step.detail)}
					</Text>
				</span>
			</li>
		{/each}
	</ol>
</nav>

<style>
	.workflow {
		width: 100%;
	}

	.workflow__list {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.workflow__step {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		min-width: 0;
		padding: var(--space-md) 0;
		border-bottom: var(--border-width) solid var(--color-border);
		color: var(--color-text-secondary);
	}

	.workflow__step[data-status="current"] {
		border-bottom: var(--border-width-emphasis) solid var(--color-accent);
		color: var(--color-text-primary);
	}

	.workflow__step[data-status="failed"] {
		border-bottom: var(--border-width-emphasis) solid var(--color-danger);
	}

	.workflow__number {
		color: var(--color-text-muted);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		font-variant-numeric: tabular-nums;
		line-height: var(--line-height-body);
	}

	.workflow__step[data-status="current"] .workflow__number {
		color: var(--color-accent);
	}

	.workflow__step[data-status="failed"] .workflow__number {
		color: var(--color-danger);
	}

	.workflow__body {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	@media (max-width: 800px) {
		.workflow__step {
			gap: var(--space-sm);
			padding: var(--space-sm) 0;
		}

		:global(.workflow__detail) {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.workflow__step {
			flex-wrap: wrap;
		}
	}
</style>
