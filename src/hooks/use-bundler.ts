import { useWebContainer } from "react-webcontainers";
import { useDownloads } from "@/hooks/use-downloads";
import { useProcessTimeline } from "@/hooks/use-process";
import { parseTarballName } from "@/lib/npm";
import { spawnCollect } from "@/lib/spawn-collect";
import { useTerminal } from "@/lib/terminal";
import { now } from "@/lib/utils";

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
			terminal.error("WebContainer is not ready yet. Please wait...");
			process.fail("boot", "WebContainer not ready");
			return;
		}

		process.start("boot");
		terminal.log(`[${now()}] Starting to bundle ${pkg.name}@${pkg.version}...`);
		terminal.log(`[${now()}] Booting up...`);

		try {
			await wc.mount({});
			process.succeed("boot");

			process.start("setup");
			terminal.log(`[${now()}] Setting up environment...`);

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
					`[${now()}] Failed to initialize project (npm init). Code: ${initRes.code}`,
				);
				if (initRes.stderr) terminal.error(initRes.stderr.trim());
				return;
			}
			terminal.log(`[${now()}] Set up environment for run ${runId}`);
			process.succeed("setup");

			process.start("install");
			terminal.log(
				`[${now()}] Installing ${pkg.name}@${pkg.version} with dependencies...`,
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
				terminal.error(
					`[${now()}] npm install failed with code ${installRes.code}.`,
				);
				if (installRes.stderr) terminal.error(installRes.stderr.trim());
				terminal.log(
					"Hint: lifecycle scripts may require tools not present in the sandbox.",
				);
				return;
			}
			process.succeed("install");
			terminal.log(
				`[${now()}] Successfully installed ${pkg.name}@${pkg.version}`,
			);

			process.start("patch");
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
			} catch (e: unknown) {
				process.fail("patch", "Failed to patch package.json");
				terminal.error(
					`[${now()}] Failed to read or patch package.json for ${pkg.name}.`,
				);
				terminal.error(String((e as Error)?.message ?? e));
				return;
			}

			process.start("pack");
			terminal.log(
				`[${now()}] Creating tarball for ${pkg.name}@${pkg.version}...`,
			);

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
				terminal.error(`[${now()}] npm pack failed with code ${packRes.code}.`);
				const combined = `${packRes.stdout}\n${packRes.stderr}`.trim();
				if (combined) terminal.error(combined);
				return;
			}

			const tarballName = parseTarballName(packRes.stdout);
			if (!tarballName) {
				process.fail("pack", "Could not parse tarball name");
				terminal.error(
					`[${now()}] Could not determine tarball filename from npm pack output.`,
				);
				return;
			}

			const tarballPath = `${pkgDir}/${tarballName}`;
			terminal.log(`[${now()}] Tarball created: ${tarballPath}`);

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

			setTimeout(() => {
				URL.revokeObjectURL(tarballUrl);
				removeDownload(download);
				terminal.log(
					`[${now()}] Tarball URL ${tarballUrl} revoked after 60 seconds`,
				);
			}, 60_000);

			process.succeed("pack", tarballName);
			process.start("done");
			process.succeed("done");
		} catch (e: unknown) {
			process.fail("pack", String((e as Error)?.message ?? e));
			terminal.error(
				`[${now()}] Unexpected error: ${String((e as Error)?.message ?? e)}`,
			);
		}
	}

	return { bundle, stages: process.stages };
}
