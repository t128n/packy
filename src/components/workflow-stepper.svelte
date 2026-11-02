<script lang="ts">
	import Checkmark from "~icons/carbon/checkmark";
	import Close from "~icons/carbon/close";

	type Phase = "idle" | "running" | "done" | "error";
	type Status = "current" | "done" | "failed" | "pending";

	type Props = {
		phase: Phase;
	};

	let { phase }: Props = $props();

	const steps = ["Select", "Build", "Download"] as const;

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

	function statusText(status: Status): string {
		if (status === "current") return "Current step";
		if (status === "done") return "Completed";
		if (status === "failed") return "Failed";
		return "Not started";
	}
</script>

<nav class="stepper" aria-label="Workflow">
	<ol class="stepper__list">
		{#each steps as step, index}
			{@const status = statusFor(index)}
			<li
				class="stepper__step"
				data-status={status}
				aria-current={status === "current" ? "step" : undefined}
			>
				<span class="stepper__marker" aria-hidden="true">
					{#if status === "done"}
						<Checkmark />
					{:else if status === "failed"}
						<Close />
					{:else}
						<span class="stepper__number">
							{String(index + 1).padStart(2, "0")}
						</span>
					{/if}
				</span>
				<span class="stepper__label">{step}</span>
				<span class="sr-only">{statusText(status)}</span>
			</li>
		{/each}
	</ol>
</nav>

<style>
	.stepper__list {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.stepper__step {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-2) 0;
		border-bottom: var(--border-width) solid var(--color-border-subtle);
		color: var(--color-text-muted);
	}

	.stepper__step[data-status="current"] {
		border-bottom: var(--border-width-emphasis) solid var(--color-primary);
		color: var(--color-text-primary);
	}

	.stepper__step[data-status="failed"] {
		border-bottom: var(--border-width-emphasis) solid var(--color-error);
		color: var(--color-error);
	}

	.stepper__marker {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: var(--icon-sm);
		height: var(--icon-sm);
		flex-shrink: 0;
	}

	.stepper__marker :global(svg) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}

	.stepper__step[data-status="done"] .stepper__marker {
		color: var(--color-success);
	}

	.stepper__step[data-status="failed"] .stepper__marker {
		color: var(--color-error);
	}

	.stepper__number {
		font-family: var(--font-mono);
		font-size: var(--font-size-caption);
		font-variant-numeric: tabular-nums;
		line-height: var(--font-leading-none);
	}

	.stepper__step[data-status="current"] .stepper__number {
		color: var(--color-primary);
	}

	.stepper__label {
		font-size: var(--font-size-body);
		font-weight: var(--font-weight-medium);
		line-height: var(--font-leading-body);
	}

	.stepper__step[data-status="done"] .stepper__label {
		color: var(--color-text-secondary);
	}

	.stepper__step[data-status="current"] .stepper__label {
		color: var(--color-text-primary);
	}

	.stepper__step[data-status="pending"] .stepper__label {
		color: var(--color-text-muted);
	}
</style>
