<script lang="ts">
	import { Alert, Button, Code, Icon, Inline, Stack, Text } from "@t128n/ui";
	import Checkmark from "~icons/carbon/checkmark";
	import Copy from "~icons/carbon/copy";
	import DownloadIcon from "~icons/carbon/download";

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

<Stack gap="xl">
	<div class="receipt">
		<Text variant="caption" tone="secondary">Archive</Text>
		<p class="receipt__name">{result.filename}</p>
		<Inline align="center" gap="md" wrap>
			<Code>{result.name}@{result.version}</Code>
			<Text variant="body-sm" tone="secondary" numeric>
				{formatBytes(result.bytes.byteLength)} compressed
			</Text>
		</Inline>
	</div>

	<Inline align="center" gap="sm" wrap>
		<Button
			variant="primary"
			disabled={!downloadUrl}
			onclick={onDownload}
		>
			<Icon icon={DownloadIcon} />
			Download bundle
		</Button>
		<Button variant="secondary" onclick={onReset}>
			Create another bundle
		</Button>
	</Inline>
	{#if downloadError}
		<Alert tone="danger" title="Download could not start">{downloadError}</Alert>
	{/if}

	<Stack gap="sm">
		<Text as="h3" variant="subheading">Install locally</Text>
		<Text variant="body-sm">
			Place the archive in a <Code>./packages</Code> folder inside your project,
			then run:
		</Text>
		<Code block>{installCommand}</Code>
		<Inline align="center" gap="sm" wrap>
			<Button variant="secondary" onclick={copyCommand}>
				<Icon icon={Copy} />
				Copy command
			</Button>
			{#if copied}
				<Inline gap="xs" align="center">
					<Icon icon={Checkmark} size={16} />
					<Text
						as="span"
						variant="body-sm"
						tone="success"
						role="status"
						aria-live="polite"
					>
						Copied
					</Text>
				</Inline>
			{/if}
		</Inline>
		{#if copyError}
			<Text variant="body-sm" tone="danger" role="alert">
				{copyError}
			</Text>
		{/if}
	</Stack>

	<Text variant="body-sm" tone="secondary">
		Required dependencies are included. Optional peers and native binaries may
		need additional preparation before an offline install.
	</Text>
</Stack>

<style>
	.receipt {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		padding-block: var(--space-md);
		border-top: var(--border-width) solid var(--color-border);
		border-bottom: var(--border-width) solid var(--color-border);
	}

	.receipt__name {
		margin: 0;
		font-family: var(--font-family-mono);
		font-size: var(--font-size-heading);
		font-weight: var(--font-weight-regular);
		line-height: var(--line-height-heading);
		overflow-wrap: anywhere;
	}
</style>
