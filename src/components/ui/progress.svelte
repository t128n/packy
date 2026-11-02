<script lang="ts">
	type Props = {
		label: string;
		value?: number | null;
		max?: number;
	};

	let { label, value = null, max = 100 }: Props = $props();
</script>

<div
	class="progress"
	role="progressbar"
	aria-label={label}
	aria-valuemin={0}
	aria-valuemax={max}
	aria-valuenow={value ?? undefined}
	aria-valuetext={value === null ? label : undefined}
>
	<div class="progress__track">
		<div
			class="progress__bar"
			class:progress__bar--indeterminate={value === null}
			style={value === null ? undefined : `width: ${(value / max) * 100}%`}
		></div>
	</div>
	<p class="progress__label">{label}</p>
</div>

<style>
	.progress {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.progress__track {
		width: 100%;
		height: var(--space-1);
		overflow: hidden;
		background: var(--color-surface-2);
	}

	.progress__bar {
		height: 100%;
		background: var(--color-primary);
		transition: width var(--motion-base) var(--ease);
	}

	.progress__bar--indeterminate {
		width: 40%;
		animation: progress-slide calc(var(--motion-spin) * 2) var(--ease)
			infinite;
		transition: none;
	}

	.progress__label {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	@keyframes progress-slide {
		from {
			transform: translateX(-100%);
		}

		to {
			transform: translateX(250%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.progress__bar--indeterminate {
			width: 100%;
			animation: none;
		}
	}
</style>
