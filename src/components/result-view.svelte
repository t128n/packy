<script lang="ts">
	import Checkmark from "~icons/carbon/checkmark";
	import Copy from "~icons/carbon/copy";
	import DownloadIcon from "~icons/carbon/download";

	import Alert from "~/components/ui/alert.svelte";
	import Button from "~/components/ui/button.svelte";

	type Props = {
		result: {
			filename: string;
			name: string;
			version: string;
			bytes: Uint8Array;
		};
		downloadUrl: string | null;
		downloadError?: string;
		onDownload: () => void;
		onReset: () => void;
	};

	let { result, downloadUrl, downloadError = "", onDownload, onReset }: Props = $props();

	let copied = $state(false);
	let copyError = $state<string | null>(null);

	const installCommand = $derived(
		`npm install --ignore-scripts ./packages/${result.filename}`,
	);

	function formatBytes(bytes: number): string {
		const units = ["B", "KiB", "MiB", "GiB"];
		let value = bytes;
		let unit = 0;

		while (value >= 1024 && unit < units.length - 1) {
			value /= 1024;
			unit += 1;
		}

		const rounded =
			unit === 0 || value >= 10
				? Math.round(value)
				: Math.round(value * 10) / 10;

		return `${rounded} ${units[unit]}`;
	}

	async function copyCommand(): Promise<void> {
		copyError = null;

		try {
			await navigator.clipboard.writeText(installCommand);
			copied = true;
		} catch {
			copied = false;
			copyError = "Could not copy the command. Select it and copy manually.";
		}
	}
</script>

<div class="result-view">
	<div class="artifact">
		<p class="artifact__name">{result.filename}</p>
		<p class="artifact__meta">
			<span class="mono">{result.name}@{result.version}</span>
			<span class="artifact__sep" aria-hidden="true">·</span>
			<span>{formatBytes(result.bytes.byteLength)} compressed</span>
		</p>
		<div class="artifact__actions">
			<Button
				variant="primary"
				disabled={!downloadUrl}
				onclick={onDownload}
			>
				<DownloadIcon class="button-icon" />
				Download bundle
			</Button>
			<Button variant="ghost" onclick={onReset}>
				Create another bundle
			</Button>
		</div>
	</div>

	{#if downloadError}
		<Alert tone="danger" title="Download could not start">
			{downloadError}
		</Alert>
	{/if}

	<div class="install">
		<h3 class="install__title">Install locally</h3>
		<p class="install__description">
			Place the archive in a <code class="inline-code">./packages</code>
			folder inside your project, then run:
		</p>
		<pre class="code-block"><code>{installCommand}</code></pre>
		<div class="install__actions">
			<Button variant="secondary" onclick={copyCommand}>
				<Copy class="button-icon" />
				Copy command
			</Button>
			{#if copied}
				<span class="copy-status" role="status" aria-live="polite">
					<Checkmark class="button-icon" />
					Copied
				</span>
			{/if}
		</div>
		{#if copyError}
			<p class="install__error" role="alert">{copyError}</p>
		{/if}
	</div>
</div>

<style>
	.result-view {
		display: flex;
		flex-direction: column;
		gap: var(--space-6);
	}

	.artifact {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.artifact__name {
		margin: 0;
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-heading-sm);
		font-weight: var(--font-weight-regular);
		line-height: var(--font-leading-heading-sm);
		overflow-wrap: anywhere;
	}

	.artifact__meta {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-body);
		font-variant-numeric: tabular-nums;
		line-height: var(--font-leading-body);
	}

	.artifact__sep {
		color: var(--color-text-muted);
	}

	.artifact__actions,
	.install__actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.artifact__actions {
		margin-top: var(--space-2);
	}

	.inline-code {
		padding: var(--space-1) var(--space-2);
		border: var(--border-width) solid var(--color-border-subtle);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-mono);
		line-height: var(--font-leading-mono);
	}

	.install {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.install__title {
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-heading-sm);
		font-weight: var(--font-weight-semibold);
		line-height: var(--font-leading-heading-sm);
	}

	.install__description {
		max-width: var(--layout-measure);
		margin: 0;
		color: var(--color-text-primary);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.code-block {
		margin: 0;
		padding: var(--space-3);
		overflow-x: auto;
		border: var(--border-width) solid var(--color-border-subtle);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-mono);
		line-height: var(--font-leading-mono);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.copy-status {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		color: var(--color-success);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	.install__error {
		margin: 0;
		color: var(--color-error);
		font-size: var(--font-size-body);
		line-height: var(--font-leading-body);
	}

	:global(.button-icon) {
		width: var(--icon-sm);
		height: var(--icon-sm);
	}
</style>
