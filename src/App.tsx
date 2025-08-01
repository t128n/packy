import { useWebContainer } from "react-webcontainers";
import PackySvg from "@/assets/packy.svg";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { DownloadPanel } from "@/components/download-panel";
import { PackageBundlePanel } from "@/components/package-bundle-panel";
import { TerminalPanel } from "@/components/terminal-panel";
import { WebcontainerUnsupportedAlert } from "@/components/webcontainer-unsupported-alert";
import { useDownloads } from "@/hooks/use-downloads";
import { parseTarballName } from "@/lib/npm";
import { useTerminal } from "@/lib/terminal";

type Pkg = { name: string; version: string };

export function App() {
	const terminal = useTerminal();
	const wc = useWebContainer();
	const { addDownload, removeDownload } = useDownloads();

	async function handleBundle(pkg: Pkg) {
		terminal.clear();

		if (!wc) {
			terminal.error("WebContainer is not ready yet. Please wait...");
			return;
		}

		terminal.log(`Starting to bundle ${pkg.name}@${pkg.version}...`);
		terminal.log("Booting up...");

		await wc.mount({});

		terminal.log("Setting up environment...");

		const runId = crypto.randomUUID();
		const baseDir = `/packy/${runId}`;

		await wc.fs.mkdir(baseDir, { recursive: true });

		await (await wc.spawn("npm", ["init", "-y"], { cwd: baseDir })).exit;

		terminal.log(`Set up environment for run ${runId}`);

		terminal.log(`Installing ${pkg.name}@${pkg.version} with dependencies...`);
		await (
			await wc.spawn(
				"npm",
				["install", `${pkg.name}@${pkg.version}`, "--install-strategy=nested"],
				{ cwd: baseDir },
			)
		).exit;
		terminal.log(`Successfully installed ${pkg.name}@${pkg.version}`);

		const pkgDir = `${baseDir}/node_modules/${pkg.name}`;

		const pkgJsonRaw = await wc.fs.readFile(`${pkgDir}/package.json`);
		const pkgJsonObj = JSON.parse(new TextDecoder().decode(pkgJsonRaw));

		const bundlePkgJson = {
			...pkgJsonObj,
			bundleDependencies: { ...(pkgJsonObj.dependencies ?? {}) },
		};

		await wc.fs.writeFile(
			`${pkgDir}/package.json`,
			new TextEncoder().encode(JSON.stringify(bundlePkgJson, null, 2)),
		);

		// Create the tarball using npm pack and capture stdout to get the real filename
		terminal.log(`Creating tarball for ${pkg.name}@${pkg.version}...`);
		const packProc = await wc.spawn("npm", ["pack"], { cwd: pkgDir });

		let packStdout = "";

		packProc.output.pipeTo(
			new WritableStream({
				write(data) {
					packStdout += data;
				},
			}),
		);

		const code = await packProc.exit;
		if (code !== 0) {
			terminal.error(`npm pack failed: ${packStdout || "unknown error"}`);
			return;
		}

		const tarballName = parseTarballName(packStdout);
		if (!tarballName) {
			terminal.error(
				"Could not determine tarball filename from npm pack output.",
			);
			return;
		}

		const tarballPath = `${pkgDir}/${tarballName}`;
		terminal.log(`Tarball created: ${tarballPath}`);

		// Read the tarball as bytes and create a Blob/URL
		const data = await wc.fs.readFile(tarballPath);
		const blob = new Blob([data], { type: "application/gzip" });
		const tarballUrl = URL.createObjectURL(blob);

		terminal.log(
			`Tarball available for download: ${tarballUrl} (name: ${tarballName})`,
		);

		const download = addDownload({
			name: tarballName,
			url: tarballUrl,
			size: blob.size,
			integrity: null,
			meta: {
				package: pkg.name,
				version: pkg.version,
				expires: Date.now() + 30_000, // 60 seconds
			},
		});

		setTimeout(() => {
			URL.revokeObjectURL(tarballUrl);
			removeDownload(download);
			terminal.log(`Tarball URL ${tarballUrl} revoked after 60 seconds`);
		}, 60_000);
	}

	return (
		<AppShell>
			<AppHeader />
			<main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-[320px_1fr]">
				<WebcontainerUnsupportedAlert wc={wc} />
				<div className="flex flex-col gap-6">
					<PackageBundlePanel onBundle={handleBundle} allowVersionSelection />
					<DownloadPanel />
				</div>
				<TerminalPanel />
			</main>
			<AppFooter />
		</AppShell>
	);
}
