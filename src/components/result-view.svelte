<script lang="ts">
	import { Button } from "sveltestrap";

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

	let {
		result,
		downloadUrl,
		downloadError = "",
		onDownload,
		onReset,
	}: Props = $props();

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

<dl class="row mb-4">
	<dt class="col-sm-3 fw-normal text-body-secondary">Package</dt>
	<dd class="col-sm-9"><code>{result.name}@{result.version}</code></dd>

	<dt class="col-sm-3 fw-normal text-body-secondary">Archive</dt>
	<dd class="col-sm-9"><code class="text-break">{result.filename}</code></dd>

	<dt class="col-sm-3 fw-normal text-body-secondary">Size</dt>
	<dd class="col-sm-9">{formatBytes(result.bytes.byteLength)} compressed</dd>
</dl>

<div class="d-flex flex-wrap gap-2 mb-3">
	<Button color="primary" disabled={!downloadUrl} on:click={onDownload}>
		Download bundle
	</Button>
	<Button color="outline-secondary" on:click={onReset}>
		Create another bundle
	</Button>
</div>

{#if downloadError}
	<div class="alert alert-danger" role="alert">
		<h4 class="alert-heading">Download could not start</h4>
		<p class="mb-0">{downloadError}</p>
	</div>
{/if}

<h4 class="h5 mt-4">Install offline</h4>
<p>
	Place the archive in a <code>./packages</code> folder inside your project, then
	run this command to prevent dependency install scripts from running:
</p>
<pre class="app-log mb-2"><code>{installCommand}</code></pre>

<div class="d-flex flex-wrap align-items-center gap-2">
	<Button color="outline-secondary" size="sm" on:click={copyCommand}>
		Copy command
	</Button>
	{#if copied}
		<span class="small text-success" aria-live="polite">Copied</span>
	{/if}
</div>

{#if copyError}
	<p class="small text-danger mt-2 mb-0" role="alert">{copyError}</p>
{/if}

<p class="small text-body-secondary mt-3 mb-0">
	The command uses <code>--ignore-scripts</code>. Packages that rely on install
	scripts may need additional steps to work offline.
</p>
