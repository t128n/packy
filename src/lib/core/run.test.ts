import { describe, expect, test } from "bun:test";

import { FakeRuntime, type FakeExecCall } from "../runtime/fake";
import { isRunError, type RunError } from "./errors";
import { MAX_LOG_BYTES } from "./log";
import { runBundle } from "./run";
import type { RunStage } from "./types";

const PACKAGE_NAME = "lodash";
const PACKAGE_VERSION = "4.17.21";
const TARBALL = `${PACKAGE_NAME}-${PACKAGE_VERSION}.tgz`;
const ARCHIVE = new Uint8Array([31, 139, 8, 0, 0, 0, 0, 0, 1, 2, 3, 255]);
const TRUNCATION_MARKER = "[truncated]";
const WORKSPACE_BUNDLE_PATTERN = /^\/workspace\/[a-z0-9-]+\/bundle$/;
const WORKSPACE_MANIFEST_PATTERN =
	/^\/workspace\/[a-z0-9-]+\/bundle\/package\.json$/;

const encoder = new TextEncoder();

type Scenario = {
	installExitCode?: number;
	packExitCode?: number;
	installOutput?: string;
	packOutput?: string | null;
	reportedName?: string;
	reportedVersion?: string;
	reportedFilename?: string;
	tarballFilename?: string;
	tarballBytes?: Uint8Array;
	writeManifest?: boolean;
	writeTarball?: boolean;
	manifest?: Record<string, unknown>;
	onPack?: (call: FakeExecCall, runtime: FakeRuntime) => void;
};

function defaultManifest(): Record<string, unknown> {
	return {
		name: PACKAGE_NAME,
		version: PACKAGE_VERSION,
		description: "Lodash modular utilities.",
		main: "lodash.js",
		dependencies: { zebra: "1.0.0", alpha: "1.0.0" },
		optionalDependencies: { middle: "2.0.0", alpha: "1.0.0" },
		scripts: {
			postinstall: "node setup.js",
			test: "jest",
			lint: "eslint .",
			prepublishOnly: "npm test",
		},
	};
}

/** A fake runtime that simulates npm install and npm pack. */
function createRuntime(scenario: Scenario = {}): FakeRuntime {
	const runtime = new FakeRuntime();
	const tarballFilename = scenario.tarballFilename ?? TARBALL;
	const manifest = scenario.manifest ?? defaultManifest();
	const writeManifest = scenario.writeManifest ?? true;
	const writeTarball = scenario.writeTarball ?? true;
	const reportedName = scenario.reportedName ?? PACKAGE_NAME;
	const reportedVersion = scenario.reportedVersion ?? PACKAGE_VERSION;

	runtime.commandHandler = (call) => {
		const subcommand = call.args[0];

		if (subcommand === "install") {
			const exitCode = scenario.installExitCode ?? 0;

			if (exitCode === 0 && writeManifest) {
				runtime.put(
					`${call.cwd}/node_modules/${PACKAGE_NAME}/package.json`,
					JSON.stringify(manifest),
				);
			}

			return {
				exitCode,
				output: scenario.installOutput ?? "added 1 package\n",
			};
		}

		if (subcommand === "pack") {
			scenario.onPack?.(call, runtime);

			const exitCode = scenario.packExitCode ?? 0;

			if (exitCode !== 0) {
				return {
					exitCode,
					output: scenario.packOutput ?? "npm error pack failed\n",
				};
			}

			if (writeTarball) {
				runtime.put(
					`${call.cwd}/${tarballFilename}`,
					scenario.tarballBytes ?? ARCHIVE,
				);
			}

			if (scenario.packOutput === null) {
				return { exitCode: 0, output: "" };
			}

			const output =
				scenario.packOutput ??
				JSON.stringify([
					{
						id: `${reportedName}@${reportedVersion}`,
						name: reportedName,
						version: reportedVersion,
						filename: scenario.reportedFilename ?? tarballFilename,
					},
				]);

			return { exitCode, output };
		}

		return { exitCode: 0 };
	};

	return runtime;
}

function reference(versionSpec = "^4.0.0") {
	return { name: PACKAGE_NAME, versionSpec };
}

async function getFailure(promise: Promise<unknown>): Promise<RunError> {
	const cause = await promise.then(
		() => {
			throw new Error("Expected runBundle to reject.");
		},
		(error: unknown) => error,
	);

	if (!isRunError(cause)) {
		throw new Error(`Expected a RunError, received ${String(cause)}`);
	}

	return cause;
}

describe("runBundle", () => {
	test("runs stages in order and returns npm's identity and bytes", async () => {
		const runtime = createRuntime();
		const stages: RunStage[] = [];
		const chunks: string[] = [];

		const result = await runBundle({
			runtime,
			reference: reference(),
			onStage: (stage) => stages.push(stage),
			onLog: (chunk) => chunks.push(chunk),
		});

		expect(stages).toEqual([
			"prepare",
			"install",
			"patch",
			"pack",
			"capture",
		]);
		expect([...result.bytes]).toEqual([...ARCHIVE]);
		expect(result.filename).toBe(TARBALL);
		expect(result.name).toBe(PACKAGE_NAME);
		expect(result.version).toBe(PACKAGE_VERSION);

		const install = runtime.calls[0]!;
		expect(install.command).toBe("npm");
		expect(install.args).toEqual([
			"install",
			"--ignore-scripts",
			"--install-strategy=nested",
		]);
		expect(install.cwd).toMatch(WORKSPACE_BUNDLE_PATTERN);
		expect(install.env).toMatchObject({
			CI: "1",
			TERM: "dumb",
			NO_COLOR: "1",
			FORCE_COLOR: "0",
			npm_config_color: "false",
			npm_config_progress: "false",
			npm_config_fund: "false",
			npm_config_audit: "false",
			npm_config_update_notifier: "false",
			npm_config_loglevel: "error",
		});

		const pack = runtime.calls[1]!;
		expect(pack.command).toBe("npm");
		expect(pack.args).toEqual(["pack", "--ignore-scripts", "--json"]);
		expect(pack.cwd).toBe(`${install.cwd}/node_modules/${PACKAGE_NAME}`);

		const workspace = install.cwd.slice(0, -"/bundle".length);
		expect(runtime.removed).toEqual([workspace]);
		expect(runtime.files.size).toBe(0);

		const streamed = chunks.join("");
		expect(streamed).toContain("$ npm install");
		expect(streamed).toContain("added 1 package");
		expect(result.log).toContain("$ npm install --ignore-scripts");
		expect(result.log).toContain("$ npm pack --ignore-scripts --json");
		expect(result.log).toContain("added 1 package");
	});

	test("writes the workspace manifest before install", async () => {
		const runtime = createRuntime();

		await runBundle({ runtime, reference: reference("4.17.21") });

		const mount = runtime.mounts[0]!;
		expect(mount).toHaveLength(1);
		expect(mount[0]!.path).toMatch(WORKSPACE_MANIFEST_PATTERN);
		expect(JSON.parse(mount[0]!.contents)).toEqual({
			name: "packy-repack",
			version: "0.0.0",
			private: true,
			dependencies: { [PACKAGE_NAME]: "4.17.21" },
		});
	});

	test("patches the manifest before pack", async () => {
		let snapshot = "";
		const runtime = createRuntime({
			onPack: (call, fake) => {
				snapshot = fake.text(`${call.cwd}/package.json`);
			},
		});

		await runBundle({ runtime, reference: reference() });

		expect(snapshot.endsWith("\n")).toBe(true);

		const patched = JSON.parse(snapshot) as Record<string, unknown>;
		const expectedBundle = ["alpha", "middle", "zebra"];

		expect(patched.bundleDependencies).toEqual(expectedBundle);
		expect(patched.bundledDependencies).toEqual(expectedBundle);
		expect(patched.scripts).toEqual({
			postinstall: "echo skip-postinstall",
			test: "echo skip-test",
			lint: "eslint .",
			prepublishOnly: "echo skip-prepublishOnly",
		});
		expect(patched.description).toBe("Lodash modular utilities.");
		expect(patched.main).toBe("lodash.js");

		const lastWrite = runtime.writes.at(-1)!;
		expect(lastWrite.path).toBe(`${runtime.calls[1]!.cwd}/package.json`);
		expect(lastWrite.contents).toBe(snapshot);
	});

	test("installs peer dependencies inside the package before packing", async () => {
		const runtime = createRuntime({
			manifest: {
				name: PACKAGE_NAME,
				version: PACKAGE_VERSION,
				dependencies: { runtime: "1.0.0" },
				peerDependencies: {
					react: ">=18",
					"@types/react": "^19",
					sass: "^1.0.0",
				},
				peerDependenciesMeta: { sass: { optional: true } },
			},
		});

		const result = await runBundle({ runtime, reference: reference() });

		const install = runtime.calls[0]!;
		const peerInstall = runtime.calls[1]!;
		const pack = runtime.calls[2]!;

		expect(runtime.calls.map((call) => call.args[0])).toEqual([
			"install",
			"install",
			"pack",
		]);
		expect(peerInstall.args).toEqual(install.args);
		expect(peerInstall.cwd).toBe(
			`${install.cwd}/node_modules/${PACKAGE_NAME}`,
		);
		expect(pack.cwd).toBe(peerInstall.cwd);

		const prepared = JSON.parse(runtime.writes[0]!.contents) as Record<
			string,
			unknown
		>;
		expect(prepared.dependencies).toEqual({
			runtime: "1.0.0",
			react: ">=18",
			"@types/react": "^19",
		});

		const patched = JSON.parse(runtime.writes.at(-1)!.contents) as Record<
			string,
			unknown
		>;
		expect(patched.bundleDependencies).toEqual([
			"@types/react",
			"react",
			"runtime",
		]);
		expect(patched.bundledDependencies).toEqual([
			"@types/react",
			"react",
			"runtime",
		]);
		expect(patched.dependencies).toEqual({ runtime: "1.0.0" });
		expect(patched.peerDependencies).toEqual({
			react: ">=18",
			"@types/react": "^19",
			sass: "^1.0.0",
		});
		expect(result.log.match(/\$ npm install/g)).toHaveLength(2);
	});

	test("does not reinstall a peer that is already a dependency", async () => {
		const runtime = createRuntime({
			manifest: {
				name: PACKAGE_NAME,
				version: PACKAGE_VERSION,
				dependencies: { react: "19.0.0" },
				peerDependencies: { react: ">=18" },
			},
		});

		await runBundle({ runtime, reference: reference() });

		expect(runtime.calls.map((call) => call.args[0])).toEqual([
			"install",
			"pack",
		]);
	});

	test("fails at install with the exit code and log", async () => {
		const runtime = createRuntime({
			installExitCode: 1,
			installOutput: "npm error code E404\nnpm error 404 Not Found\n",
		});
		const stages: RunStage[] = [];

		const error = await getFailure(
			runBundle({
				runtime,
				reference: reference(),
				onStage: (stage) => stages.push(stage),
			}),
		);

		expect(error.stage).toBe("install");
		expect(error.exitCode).toBe(1);
		expect(error.log).toContain("$ npm install --ignore-scripts");
		expect(error.log).toContain("npm error code E404");
		expect(stages).toEqual(["prepare", "install"]);
		expect(runtime.calls).toHaveLength(1);
		expect(runtime.removed).toHaveLength(1);
		expect(runtime.files.size).toBe(0);
	});

	test("fails at pack with the exit code", async () => {
		const runtime = createRuntime({
			packExitCode: 2,
			packOutput: "npm error pack exploded\n",
		});
		const stages: RunStage[] = [];

		const error = await getFailure(
			runBundle({
				runtime,
				reference: reference(),
				onStage: (stage) => stages.push(stage),
			}),
		);

		expect(error.stage).toBe("pack");
		expect(error.exitCode).toBe(2);
		expect(error.log).toContain("npm error pack exploded");
		expect(stages).toEqual(["prepare", "install", "patch", "pack"]);
		expect(runtime.removed).toHaveLength(1);
	});

	test("fails at patch when the installed manifest is missing", async () => {
		const runtime = createRuntime({ writeManifest: false });

		const error = await getFailure(
			runBundle({ runtime, reference: reference() }),
		);

		expect(error.stage).toBe("patch");
		expect(error.message).toContain("Could not read");
		expect(runtime.removed).toHaveLength(1);
	});

	test("fails at capture when no tarball exists", async () => {
		const runtime = createRuntime({
			packOutput: null,
			writeTarball: false,
		});

		const error = await getFailure(
			runBundle({ runtime, reference: reference() }),
		);

		expect(error.stage).toBe("capture");
		expect(error.message).toContain(".tgz");
		expect(error.log).toContain("$ npm pack");
		expect(runtime.removed).toHaveLength(1);
	});

	test("fails at capture when the reported identity does not match", async () => {
		const runtime = createRuntime({ reportedVersion: "9.9.9" });

		const error = await getFailure(
			runBundle({ runtime, reference: reference() }),
		);

		expect(error.stage).toBe("capture");
		expect(error.message).toContain("9.9.9");
		expect(error.message).toContain(PACKAGE_VERSION);
		expect(runtime.removed).toHaveLength(1);
	});

	test("uses the single tarball when pack output cannot be parsed", async () => {
		const runtime = createRuntime({ packOutput: null });

		const result = await runBundle({
			runtime,
			reference: reference(),
		});

		expect(result.filename).toBe(TARBALL);
		expect(result.name).toBe(PACKAGE_NAME);
		expect(result.version).toBe(PACKAGE_VERSION);
		expect([...result.bytes]).toEqual([...ARCHIVE]);
		expect(runtime.lists).toEqual([runtime.calls[1]!.cwd]);
	});

	test("never reconstructs the filename from the package name", async () => {
		const customName = "custom-archive.tgz";
		const runtime = createRuntime({
			reportedFilename: customName,
			tarballFilename: customName,
		});

		const result = await runBundle({
			runtime,
			reference: reference(),
		});

		expect(result.filename).toBe(customName);
	});

	test("reports cleanup errors without masking the primary failure", async () => {
		const runtime = createRuntime({ installExitCode: 1 });
		runtime.removeError = new Error("rm failed");

		const error = await getFailure(
			runBundle({ runtime, reference: reference() }),
		);

		expect(error.stage).toBe("install");
		expect(error.exitCode).toBe(1);
		expect(error.log).toContain("[cleanup] rm failed");
		expect(runtime.removed).toHaveLength(1);
	});

	test("rejects a second concurrent run at prepare", async () => {
		const runtime = createRuntime();
		const baseHandler = runtime.commandHandler!;
		let release: () => void = () => {};
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});

		runtime.commandHandler = async (call, fake) => {
			if (call.args[0] === "install") {
				await gate;
			}

			return baseHandler(call, fake);
		};

		const first = runBundle({ runtime, reference: reference() });
		const secondStages: RunStage[] = [];
		const second = await getFailure(
			runBundle({
				runtime,
				reference: { name: "other", versionSpec: "1.0.0" },
				onStage: (stage) => secondStages.push(stage),
			}),
		);

		expect(second.stage).toBe("prepare");
		expect(second.message).toContain("already active");
		expect(secondStages).toEqual([]);

		release();
		const result = await first;

		expect(result.name).toBe(PACKAGE_NAME);
		expect(runtime.mounts).toHaveLength(1);
		expect(runtime.removed).toHaveLength(1);
	});

	test("allows concurrent runs on different runtime instances", async () => {
		const firstRuntime = createRuntime();
		const secondRuntime = createRuntime();

		const [first, second] = await Promise.all([
			runBundle({ runtime: firstRuntime, reference: reference() }),
			runBundle({ runtime: secondRuntime, reference: reference() }),
		]);

		expect(first.name).toBe(PACKAGE_NAME);
		expect(second.name).toBe(PACKAGE_NAME);
		expect(firstRuntime.mounts).toHaveLength(1);
		expect(secondRuntime.mounts).toHaveLength(1);
	});

	test("allows concurrent runs on different runtime instances", async () => {
		const first = createRuntime();
		const second = createRuntime();

		const [left, right] = await Promise.all([
			runBundle({ runtime: first, reference: reference() }),
			runBundle({ runtime: second, reference: reference() }),
		]);

		expect(left.filename).toBe(TARBALL);
		expect(right.filename).toBe(TARBALL);
		expect(first.removed).toHaveLength(1);
		expect(second.removed).toHaveLength(1);
	});

	test("rejects an unsafe reported archive filename at capture", async () => {
		const runtime = createRuntime({
			reportedFilename: "../evil.tgz",
			tarballFilename: "../evil.tgz",
		});

		const error = await getFailure(
			runBundle({ runtime, reference: reference() }),
		);

		expect(error.stage).toBe("capture");
		expect(error.message).toContain("unsafe");
		expect(runtime.removed).toHaveLength(1);
	});

	test("caps the retained log and streams chunks", async () => {
		const output = "x".repeat(MAX_LOG_BYTES + 4096);
		const runtime = createRuntime({ installOutput: output });
		const chunks: string[] = [];

		const result = await runBundle({
			runtime,
			reference: reference(),
			onLog: (chunk) => chunks.push(chunk),
		});

		expect(result.log.startsWith(TRUNCATION_MARKER)).toBe(true);
		expect(encoder.encode(result.log).length).toBeLessThanOrEqual(
			MAX_LOG_BYTES + TRUNCATION_MARKER.length,
		);
		expect(chunks.join("").length).toBeGreaterThan(MAX_LOG_BYTES);
		expect(result.log).toContain(`"filename":"${TARBALL}"`);
	});

	test("strips ANSI escapes and normalizes line endings", async () => {
		const runtime = createRuntime({
			installOutput: "one\r\ntwo\rthree\n\u001b[31mred\u001b[0m\n",
		});

		const result = await runBundle({
			runtime,
			reference: reference(),
		});

		expect(result.log).toContain("one\ntwo\nthree\nred\n");
		expect(result.log).not.toContain("\u001b");
		expect(result.log).not.toContain("\r");
	});

	test("rejects invalid input at prepare without touching the runtime", async () => {
		const runtime = createRuntime();

		const error = await getFailure(
			runBundle({
				runtime,
				reference: { name: "", versionSpec: "latest" },
			}),
		);

		expect(error.stage).toBe("prepare");
		expect(runtime.mounts).toHaveLength(0);
		expect(runtime.calls).toHaveLength(0);
		expect(runtime.removed).toHaveLength(0);
	});
});
