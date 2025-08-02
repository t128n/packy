import { useWebContainer } from "react-webcontainers";
import { useDownloads } from "@/hooks/use-downloads";
import { useProcessTimeline } from "@/hooks/use-process";
import { parseTarballName } from "@/lib/npm";
import { spawnCollect } from "@/lib/spawn-collect";
import { useTerminal } from "@/lib/terminal";

type Pkg = { name: string; version: string };

export function useBundler() {
	const wc = useWebContainer();
	const terminal = useTerminal();
	const { addDownload, removeDownload } = useDownloads();
	const process = useProcessTimeline();

	async function bundle(pkg: Pkg) {
		terminal.clear();
		process.reset();

		if (!wc) {
			terminal.error(
				"WebContainer is not ready yet. Please wait a moment and try again.",
			);
			process.fail("boot", "WebContainer not ready");
			return;
		}

		process.start("boot");
		terminal.log(`Starting build: ${pkg.name}@${pkg.version}`);
		terminal.log("Booting WebContainer environment…");

		try {
			await wc.mount({});
			process.succeed("boot");

			process.start("setup");
			terminal.log("Setting up isolated workspace…");

			const runId = crypto.randomUUID();
			const baseDir = `/packy/${runId}`;
			await wc.fs.mkdir(baseDir, { recursive: true });

			const initRes = await spawnCollect({
				wc,
				cmd: "npm",
				args: ["init", "-y"],
				cwd: baseDir,
				env: { npm_config_fund: "false", npm_config_audit: "false" },
			});
			if (initRes.code !== 0) {
				process.fail("setup", "npm init failed");
				terminal.error(
					`Failed to initialize workspace (npm init). Exit code: ${initRes.code}`,
				);
				if (initRes.stderr) terminal.error(initRes.stderr.trim());
				terminal.log("Tip: Re-run the bundle or pick a different package/version.");
				return;
			}
			terminal.log(`Workspace ready (run: ${runId}).`);
			process.succeed("setup");

			process.start("install");
			terminal.log(
				`Resolving and installing dependencies for ${pkg.name}@${pkg.version}…`,
			);

			const installRes = await spawnCollect({
				wc,
				cmd: "npm",
				args: [
					"install",
					`${pkg.name}@${pkg.version}`,
					"--install-strategy=nested",
				],
				cwd: baseDir,
				env: {
					npm_config_ignore_scripts: "true",
					npm_config_fund: "false",
					npm_config_audit: "false",
					npm_config_progress: "false",
				},
			});

			if (installRes.code !== 0) {
				process.fail("install", "npm install failed");
				terminal.error(`Install failed with exit code ${installRes.code}.`);
				if (installRes.stderr) terminal.error(installRes.stderr.trim());
				terminal.log(
					"Hint: Package lifecycle scripts are disabled in this sandbox. If the package requires native builds or git, try another version or package.",
				);
				return;
			}
			process.succeed("install");
			terminal.log(`Installed ${pkg.name}@${pkg.version} successfully.`);

			// Nerd info: count installed dependencies
			try {
				const lockRaw = await wc.fs.readFile(`${baseDir}/package-lock.json`);
				const lock = JSON.parse(new TextDecoder().decode(lockRaw));
				let depCount = 0;
				if (lock.packages) {
					// packages keys include "" (root) and "node_modules/<name>"
					depCount = Object.keys(lock.packages).filter((k) =>
						k.startsWith("node_modules/"),
					).length;
				} else if (lock.dependencies) {
					depCount = Object.keys(lock.dependencies).length;
				}
				terminal.log(
					`Dependencies installed: ${depCount.toLocaleString()} packages.`,
				);
			} catch {
				// best-effort; ignore if lockfile missing
				terminal.log(
					"Dependencies installed: count unavailable (no lockfile).",
				);
			}

			process.start("patch");
			terminal.log("Preparing package for packing (disabling lifecycle hooks)…");
			const pkgDir = `${baseDir}/node_modules/${pkg.name}`;
			try {
				const pkgJsonRaw = await wc.fs.readFile(`${pkgDir}/package.json`);
				const pkgJsonObj = JSON.parse(new TextDecoder().decode(pkgJsonRaw));
				const bundlePkgJson = {
					...pkgJsonObj,
					scripts: {
						...(pkgJsonObj.scripts ?? {}),
						prepare: "echo skip-prepare",
						prepack: "echo skip-prepack",
						postpack: "echo skip-postpack",
						install: "echo skip-install",
						postinstall: "echo skip-postinstall",
					},
					bundleDependencies: { ...(pkgJsonObj.dependencies ?? {}) },
				};
				await wc.fs.writeFile(
					`${pkgDir}/package.json`,
					new TextEncoder().encode(JSON.stringify(bundlePkgJson, null, 2)),
				);
				process.succeed("patch");
				terminal.log("Package metadata patched for reproducible pack.");
			} catch (e: unknown) {
				process.fail("patch", "Failed to patch package.json");
				terminal.error(`Could not patch package.json for ${pkg.name}.`);
				terminal.error(String((e as Error)?.message ?? e));
				terminal.log(
					"Tip: Some packages have unusual layouts that prevent packing in-browser.",
				);
				return;
			}

			process.start("pack");
			terminal.log("Creating tarball (npm pack)…");

			const packRes = await spawnCollect({
				wc,
				cmd: "npm",
				args: ["pack", "--silent"],
				cwd: pkgDir,
				env: {
					npm_config_ignore_scripts: "true",
					npm_config_fund: "false",
					npm_config_audit: "false",
					npm_config_progress: "false",
					npm_config_git: "false",
				},
			});

			if (packRes.code !== 0) {
				process.fail("pack", "npm pack failed");
				terminal.error(`npm pack failed with exit code ${packRes.code}.`);
				const combined = `${packRes.stdout}\n${packRes.stderr}`.trim();
				if (combined) terminal.error(combined);
				terminal.log(
					"Tip: Try a different version. Some packages expect git or native tooling.",
				);
				return;
			}

			const tarballName = parseTarballName(packRes.stdout);
			if (!tarballName) {
				process.fail("pack", "Could not parse tarball name");
				terminal.error("Could not determine tarball filename from npm pack output.");
				return;
			}

			const tarballPath = `${pkgDir}/${tarballName}`;
			terminal.log(`Tarball created at: ${tarballPath}`);
			terminal.log("Your download link will be valid for 60 seconds.");

			const data = await wc.fs.readFile(tarballPath);
			const blob = new Blob([data], { type: "application/gzip" });
			const tarballUrl = URL.createObjectURL(blob);

			const download = addDownload({
				name: tarballName,
				url: tarballUrl,
				size: blob.size,
				integrity: null,
				meta: {
					package: pkg.name,
					version: pkg.version,
					expires: Date.now() + 60_000,
				},
			});

			const sizeKb = Math.max(1, Math.round(blob.size / 1024));
			terminal.log(
				`Download ready: ${tarballName} (${sizeKb} KB). Click the download entry above to save.`,
			);

			setTimeout(() => {
				URL.revokeObjectURL(tarballUrl);
				removeDownload(download);
				terminal.log("Download link expired and has been revoked.");
			}, 60_000);

			process.succeed("pack", tarballName);
			process.start("done");
			terminal.log(
				"Done. You can now import the tarball into your project or upload it to your registry.",
			);
			process.succeed("done");
		} catch (e: unknown) {
			process.fail("pack", String((e as Error)?.message ?? e));
			terminal.error(`Unexpected error: ${String((e as Error)?.message ?? e)}`);
			terminal.log(
				"If this keeps happening, please open an issue with the error details.",
			);
		}
	}

	return { bundle, stages: process.stages };
}
