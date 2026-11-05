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

<div class="table-responsive">
	<table class="table table-sm app-meta-table mb-3 w-auto">
		<tbody>
			<tr>
				<th scope="row">Package</th>
				<td><code>{result.name}@{result.version}</code></td>
			</tr>
			<tr>
				<th scope="row">Archive</th>
				<td><code class="text-break">{result.filename}</code></td>
			</tr>
			<tr>
				<th scope="row">Size</th>
				<td>{formatBytes(result.bytes.byteLength)} compressed</td>
			</tr>
		</tbody>
	</table>
</div>

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
		<h3 class="alert-heading h6">Download could not start</h3>
		<p class="mb-0">{downloadError}</p>
	</div>
{/if}

<h3 class="h5 mt-4">Install</h3>
<p class="small text-body-secondary mb-2">
	Place the archive in <code>./packages</code>, then run:
</p>
<div class="d-flex flex-wrap align-items-start gap-2 mb-2">
	<pre class="app-log app-install-command"><code>{installCommand}</code></pre>
	<Button color="outline-secondary" size="sm" on:click={copyCommand}>
		Copy command
	</Button>
</div>

{#if copied}
	<span class="small text-success" aria-live="polite">Copied</span>
{/if}

{#if copyError}
	<p class="small text-danger mt-2 mb-0" role="alert">{copyError}</p>
{/if}

<p class="form-text mb-0">
	Install scripts are disabled. Packages that require them may need extra
	preparation.
</p>
