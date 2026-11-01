<script lang="ts">
	import { Button, Code, Icon, Inline, Stack, Text } from "@t128n/ui";
	import DownloadIcon from "~icons/carbon/download";

	type Props = {
		result: {
			filename: string;
			name: string;
			version: string;
			bytes: Uint8Array;
		};
		downloadUrl: string | null;
		onDownload: () => void;
		onReset: () => void;
	};

	let { result, downloadUrl, onDownload, onReset }: Props = $props();

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

<Stack gap="lg">
	<Stack gap="sm">
		<Inline align="center" gap="sm" wrap>
			<Code>{result.name}@{result.version}</Code>
			<Text variant="body-sm" tone="secondary" numeric>
				{formatBytes(result.bytes.byteLength)} compressed
			</Text>
		</Inline>
		<div class="filename">
			<Code>{result.filename}</Code>
		</div>
	</Stack>

	<Inline align="center" gap="sm" wrap>
		<Button
			variant="primary"
			disabled={!downloadUrl}
			onclick={onDownload}
		>
			<Icon icon={DownloadIcon} />
			Download {result.filename}
		</Button>
		<Button variant="secondary" onclick={onReset}>
			Bundle another package
		</Button>
	</Inline>

	<Stack gap="sm">
		<Text as="h3" variant="subheading">Install the bundle</Text>
		<Text variant="body-sm">
			Place the archive in a <Code>./packages</Code> folder inside your project,
			then run this command to prevent dependency install scripts from running:
		</Text>
		<Code block>{installCommand}</Code>
		<Inline align="center" gap="sm" wrap>
			<Button variant="secondary" onclick={copyCommand}>Copy command</Button>
			{#if copied}
				<Text as="span" variant="body-sm" tone="success" aria-live="polite">
					Copied
				</Text>
			{/if}
		</Inline>
		{#if copyError}
			<Text variant="body-sm" tone="danger" role="alert">
				{copyError}
			</Text>
		{/if}
	</Stack>
</Stack>

<style>
	.filename :global(code) {
		overflow-wrap: anywhere;
	}
</style>
