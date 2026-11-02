<script lang="ts">
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
					<span class="workflow__label">{step.label}</span>
					<span class="workflow__detail">
						{detailFor(status, step.detail)}
					</span>
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
		gap: var(--space-3);
		min-width: 0;
		padding: var(--space-3) 0;
		border-bottom: var(--border-width) solid var(--color-border-subtle);
	}

	.workflow__step[data-status="current"] {
		border-bottom: var(--border-width-emphasis) solid var(--color-primary);
	}

	.workflow__step[data-status="failed"] {
		border-bottom: var(--border-width-emphasis) solid var(--color-error);
	}

	.workflow__number {
		color: var(--color-text-muted);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-caption);
		font-variant-numeric: tabular-nums;
		line-height: var(--font-leading-body);
	}

	.workflow__step[data-status="current"] .workflow__number {
		color: var(--color-primary);
	}

	.workflow__step[data-status="failed"] .workflow__number {
		color: var(--color-error);
	}

	.workflow__body {
		display: flex;
		flex: 1;
		flex-direction: column;
		min-width: 0;
	}

	.workflow__label {
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-medium);
		line-height: var(--font-leading-body);
	}

	.workflow__step[data-status="current"] .workflow__label,
	.workflow__step[data-status="done"] .workflow__label,
	.workflow__step[data-status="failed"] .workflow__label {
		color: var(--color-text-primary);
	}

	.workflow__detail {
		color: var(--color-text-muted);
		font-size: var(--font-size-caption);
		line-height: var(--font-leading-caption);
	}

	.workflow__step[data-status="failed"] .workflow__detail {
		color: var(--color-error);
	}

	@media (max-width: 800px) {
		.workflow__step {
			gap: var(--space-2);
			padding: var(--space-2) 0;
		}

		.workflow__detail {
			display: none;
		}
	}

	@media (max-width: 639px) {
		.workflow__step {
			flex-wrap: wrap;
		}
	}
</style>
