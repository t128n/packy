import { RunError, toRunError } from "./errors";
import { createLogBuffer, stripAnsi } from "./log";
import { normalizePackageReference } from "./normalize-input";
import { findTarball, parsePackOutput } from "./parse-pack-output";
import {
	patchInstalledManifest,
	requiredPeerDependencies,
} from "./patch-manifest";
import type { RunOptions, RunResult, Runtime } from "./types";
import { createWorkspaceManifest } from "./workspace-manifest";

const WORKSPACE_ROOT = "/workspace";
const BUNDLE_DIRECTORY = "bundle";
const MANIFEST_FILENAME = "package.json";

const INSTALL_ARGS = [
	"install",
	"--ignore-scripts",
	"--install-strategy=nested",
];

const PACK_ARGS = ["pack", "--ignore-scripts", "--json"];

/**
 * Fixed environment for every command. Color, progress, audit, funding and
 * update notices all write to the captured output unless they are disabled.
 */
const COMMAND_ENV: Record<string, string> = {
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
};

const RUN_ID_PATTERN = /^[a-z0-9-]+$/;

/** One run at a time per runtime instance. */
const activeRuns = new WeakSet<Runtime>();

type OutputSink = (chunk: string) => void;

type LogBuffer = {
	append(chunk: string): void;
	text(): string;
};

function createRunId(): string {
	const id = crypto.randomUUID().toLowerCase();

	if (!RUN_ID_PATTERN.test(id)) {
		throw new RunError({
			stage: "prepare",
			message: `Generated workspace id "${id}" is not a valid run id.`,
		});
	}

	return id;
}

function stringifyManifest(value: unknown): string {
	return `${JSON.stringify(value, null, "\t")}\n`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(cause: unknown): string {
	return cause instanceof Error ? cause.message : String(cause);
}

function dependencyNames(value: unknown): string[] {
	return isRecord(value) ? Object.keys(value) : [];
}

function parseInstalledManifest(text: string): Record<string, unknown> {
	let value: unknown;

	try {
		value = JSON.parse(text);
	} catch (cause) {
		throw new RunError({
			stage: "patch",
			message: "The installed package.json is not valid JSON.",
			cause,
		});
	}

	if (!isRecord(value)) {
		throw new RunError({
			stage: "patch",
			message: "The installed package.json is not a JSON object.",
		});
	}

	return value;
}

/**
 * Sanitize a runtime chunk once, then fan it out to the bounded log and the
 * caller's live stream.
 */
function createOutputSink(
	log: LogBuffer,
	onLog?: (chunk: string) => void,
): OutputSink {
	return (chunk) => {
		if (chunk.length === 0) {
			return;
		}

		const sanitized = stripAnsi(chunk).replace(/\r\n?/g, "\n");

		if (sanitized.length === 0) {
			return;
		}

		log.append(sanitized);
		onLog?.(sanitized);
	};
}

function recordCommand(
	sink: OutputSink,
	command: string,
	args: string[],
): void {
	sink(`$ ${[command, ...args].join(" ")}\n`);
}

async function runCommand(
	runtime: Runtime,
	sink: OutputSink,
	command: string,
	args: string[],
	cwd: string,
	env: Record<string, string>,
	onRawOutput?: OutputSink,
): Promise<number> {
	recordCommand(sink, command, args);

	const result = await runtime.exec(command, args, {
		cwd,
		env,
		onOutput: (chunk) => {
			onRawOutput?.(chunk);
			sink(chunk);
		},
	});

	return result.exitCode;
}

function assertTarballFilename(filename: string): void {
	if (
		!filename.endsWith(".tgz") ||
		filename.includes("/") ||
		filename.includes("\\") ||
		filename === "." ||
		filename === ".."
	) {
		throw new RunError({
			stage: "capture",
			message: `npm reported an unsafe archive filename "${filename}".`,
		});
	}
}

function identityOf(manifest: Record<string, unknown>): {
	name: string;
	version: string;
} {
	const name = typeof manifest.name === "string" ? manifest.name : "";
	const version =
		typeof manifest.version === "string" ? manifest.version : "";

	return { name, version };
}

/**
 * Turn one package reference into one npm tarball.
 *
 * Stages run in order: prepare → install → patch → pack → capture. The
 * workspace is always removed before the result or failure is reported, and no
 * partial result is ever returned.
 */
export async function runBundle(options: RunOptions): Promise<RunResult> {
	const { runtime } = options;

	if (activeRuns.has(runtime)) {
		throw new RunError({
			stage: "prepare",
			message: "Another run is already active.",
			log: "",
		});
	}

	activeRuns.add(runtime);

	const { reference } = options;
	const log = createLogBuffer();
	const sink = createOutputSink(log, options.onLog);

	let workspace: string | null = null;
	let primary: RunError | null = null;
	let packed: Omit<RunResult, "log"> | null = null;

	try {
		options.onStage?.("prepare");

		const normalized = normalizePackageReference({
			name: reference.name,
			version: reference.versionSpec,
		});

		const workspaceDirectory = `${WORKSPACE_ROOT}/${createRunId()}`;
		workspace = workspaceDirectory;

		const bundleDirectory = `${workspaceDirectory}/${BUNDLE_DIRECTORY}`;
		const installedDirectory = `${bundleDirectory}/node_modules/${normalized.name}`;
		const installedManifestPath = `${installedDirectory}/${MANIFEST_FILENAME}`;
		const commandEnv = { ...COMMAND_ENV };

		try {
			await runtime.mount([
				{
					path: `${bundleDirectory}/${MANIFEST_FILENAME}`,
					contents: stringifyManifest(
						createWorkspaceManifest(normalized),
					),
				},
			]);
		} catch (cause) {
			throw toRunError(cause, "prepare");
		}

		options.onStage?.("install");

		let installExitCode: number;

		try {
			installExitCode = await runCommand(
				runtime,
				sink,
				"npm",
				INSTALL_ARGS,
				bundleDirectory,
				commandEnv,
			);
		} catch (cause) {
			throw toRunError(cause, "install");
		}

		if (installExitCode !== 0) {
			throw new RunError({
				stage: "install",
				message: `npm install failed with exit code ${installExitCode}.`,
				exitCode: installExitCode,
			});
		}

		options.onStage?.("patch");

		let installedText: string;

		try {
			installedText = await runtime.readText(installedManifestPath);
		} catch (cause) {
			throw new RunError({
				stage: "patch",
				message: `Could not read ${installedManifestPath}: ${errorMessage(cause)}`,
				cause,
			});
		}

		const installed = parseInstalledManifest(installedText);

		// npm hoists peer dependencies out of the installed package with the
		// nested strategy. Install them inside the package so npm pack can
		// include them in the archive.
		const nestedDependencies = new Set([
			...dependencyNames(installed.dependencies),
			...dependencyNames(installed.optionalDependencies),
		]);
		const peersToInstall = Object.fromEntries(
			Object.entries(requiredPeerDependencies(installed)).filter(
				([name]) => !nestedDependencies.has(name),
			),
		);

		if (Object.keys(peersToInstall).length > 0) {
			const peerManifest = {
				...installed,
				dependencies: {
					...(isRecord(installed.dependencies)
						? installed.dependencies
						: {}),
					...peersToInstall,
				},
			};

			try {
				await runtime.writeText(
					installedManifestPath,
					stringifyManifest(peerManifest),
				);
			} catch (cause) {
				throw new RunError({
					stage: "patch",
					message: `Could not write ${installedManifestPath}: ${errorMessage(cause)}`,
					cause,
				});
			}

			let peerInstallExitCode: number;

			try {
				peerInstallExitCode = await runCommand(
					runtime,
					sink,
					"npm",
					INSTALL_ARGS,
					installedDirectory,
					commandEnv,
				);
			} catch (cause) {
				throw toRunError(cause, "patch");
			}

			if (peerInstallExitCode !== 0) {
				throw new RunError({
					stage: "patch",
					message: `npm install for peer dependencies failed with exit code ${peerInstallExitCode}.`,
					exitCode: peerInstallExitCode,
				});
			}
		}

		const patched = patchInstalledManifest(installed);

		try {
			await runtime.writeText(
				installedManifestPath,
				stringifyManifest(patched),
			);
		} catch (cause) {
			throw new RunError({
				stage: "patch",
				message: `Could not write ${installedManifestPath}: ${errorMessage(cause)}`,
				cause,
			});
		}

		options.onStage?.("pack");

		const packLog = createLogBuffer();
		let packExitCode: number;

		try {
			packExitCode = await runCommand(
				runtime,
				sink,
				"npm",
				PACK_ARGS,
				installedDirectory,
				commandEnv,
				(chunk) => packLog.append(chunk),
			);
		} catch (cause) {
			throw toRunError(cause, "pack");
		}

		if (packExitCode !== 0) {
			throw new RunError({
				stage: "pack",
				message: `npm pack failed with exit code ${packExitCode}.`,
				exitCode: packExitCode,
			});
		}

		options.onStage?.("capture");

		const installedIdentity = identityOf(installed);
		const reported = parsePackOutput(packLog.text());

		let filename: string;
		let name: string;
		let version: string;

		if (reported !== null) {
			if (
				reported.name !== installedIdentity.name ||
				reported.version !== installedIdentity.version
			) {
				throw new RunError({
					stage: "capture",
					message: `npm packed ${reported.name}@${reported.version} but ${installedIdentity.name}@${installedIdentity.version} was installed.`,
				});
			}

			filename = reported.filename;
			name = reported.name;
			version = reported.version;
			assertTarballFilename(filename);
		} else {
			let entries: string[];

			try {
				entries = await runtime.list(installedDirectory);
			} catch (cause) {
				throw new RunError({
					stage: "capture",
					message: `Could not list ${installedDirectory}: ${errorMessage(cause)}`,
					cause,
				});
			}

			const tarball = findTarball(entries);

			if (tarball === null) {
				throw new RunError({
					stage: "capture",
					message: `npm pack reported no archive and ${installedDirectory} does not contain exactly one .tgz file.`,
				});
			}

			if (
				installedIdentity.name.length === 0 ||
				installedIdentity.version.length === 0
			) {
				throw new RunError({
					stage: "capture",
					message: `The installed package.json has no name or version, so ${tarball} cannot be identified.`,
				});
			}

			filename = tarball;
			name = installedIdentity.name;
			version = installedIdentity.version;
			assertTarballFilename(filename);
		}

		let bytes: Uint8Array;

		try {
			bytes = await runtime.readBinary(
				`${installedDirectory}/${filename}`,
			);
		} catch (cause) {
			throw new RunError({
				stage: "capture",
				message: `Could not read archive "${filename}": ${errorMessage(cause)}`,
				cause,
			});
		}

		packed = { bytes, filename, name, version };
	} catch (cause) {
		primary = toRunError(cause, "prepare");
	} finally {
		if (workspace !== null) {
			try {
				await runtime.remove(workspace);
			} catch (cause) {
				sink(`[cleanup] ${errorMessage(cause)}\n`);
			}
		}

		activeRuns.delete(runtime);
	}

	if (primary !== null) {
		throw new RunError({
			stage: primary.stage,
			message: primary.message,
			exitCode: primary.exitCode,
			log: log.text(),
			cause: primary.cause ?? primary,
		});
	}

	if (packed === null) {
		throw new RunError({
			stage: "prepare",
			message: "The run produced no archive.",
			log: log.text(),
		});
	}

	return { ...packed, log: log.text() };
}
