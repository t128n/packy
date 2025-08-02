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
	const { addDownload, items } = useDownloads();
	const process = useProcessTimeline();

	async function bundle(pkg: Pkg) {
		terminal.clear();
		process.reset();

		// Skip if a download for the same package@version already exists
		const existing = items.find(
			(d) => d.meta?.package === pkg.name && d.meta?.version === pkg.version,
		);
		if (existing) {
			terminal.log(
				`A download for ${pkg.name}@${pkg.version} already exists: ${existing.name}. Skipping bundle.`,
			);
			process.start("done");
			process.succeed("done");
			return;
		}

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

			// Nerd info: count installed dependencies + extra details
			try {
				// Node/npm versions inside the container
				const [nodeV, npmV] = await Promise.all([
					spawnCollect({ wc, cmd: "node", args: ["-v"], cwd: baseDir }),
					spawnCollect({ wc, cmd: "npm", args: ["-v"], cwd: baseDir }),
				]);
				const nodeVer = nodeV.stdout.trim();
				const npmVer = npmV.stdout.trim();
				if (nodeVer || npmVer) {
					terminal.log(`Env: node ${nodeVer || "?"}, npm ${npmVer || "?"}`);
				}

				const lockRaw = await wc.fs.readFile(`${baseDir}/package-lock.json`);
				const lock = JSON.parse(new TextDecoder().decode(lockRaw));

				// Total installed package entries
				let totalPackages = 0;
				if (lock.packages) {
					totalPackages = Object.keys(lock.packages).filter((k) =>
						k === "" ? false : k.startsWith("node_modules/"),
					).length;
				} else if (lock.dependencies) {
					totalPackages = Object.keys(lock.dependencies).length;
				}

				// Direct dependency count for the installed package (approx from its package.json)
				let directDeps = 0;
				try {
					const pkgJsonRaw = await wc.fs.readFile(
						`${baseDir}/node_modules/${pkg.name}/package.json`,
					);
					const pkgJsonObj = JSON.parse(new TextDecoder().decode(pkgJsonRaw));
					directDeps = Object.keys(pkgJsonObj.dependencies ?? {}).length;
				} catch {
					// ignore
				}

				// Estimate maximum nesting depth from lockfile package keys
				let maxDepth = 1;
				if (lock.packages) {
					for (const key of Object.keys(lock.packages)) {
						if (!key.startsWith("node_modules/")) continue;
						const segs = key.split("node_modules/").filter(Boolean);
						maxDepth = Math.max(maxDepth, segs.length);
					}
				}

				// Rough deduped size estimate by summing unique resolved versions
				let uniqueCount = 0;
				if (lock.packages) {
					const seen = new Set<string>();
					type PkgEntry = { version?: string };
					const entries = Object.entries(lock.packages) as Array<
						[string, PkgEntry | undefined]
					>;
					for (const [k, v] of entries) {
						if (!k || !k.startsWith("node_modules/")) continue;
						const name = k
							.replace(/^node_modules\//, "")
							.split("/node_modules/")[0];
						const version = v?.version ?? "";
						if (name && version) seen.add(`${name}@${version}`);
					}
					uniqueCount = seen.size;
				}

				terminal.log(
					`Dependencies installed: ${totalPackages.toLocaleString()} packages (direct: ${directDeps}, unique versions: ${uniqueCount || "n/a"}, max depth: ${maxDepth}).`,
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
			terminal.log("Saved to your Downloads panel with 7-day retention.");

			const data = await wc.fs.readFile(tarballPath);
			const blob = new Blob([data], { type: "application/gzip" });

			const created = addDownload({
				name: tarballName,
				blob,
				integrity: null,
				meta: {
					package: pkg.name,
					version: pkg.version,
				},
			});

			const sizeKb = Math.max(1, Math.round(blob.size / 1024));
			terminal.log(
				`Download ready: ${created.name} (${sizeKb} KB). It will be retained for 7 days.`,
			);

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
