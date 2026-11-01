import {
	WebContainer as WebContainerClass,
	type DirectoryNode,
	type FileSystemTree,
	type WebContainer as WebContainerInstance,
} from "@webcontainer/api";

import type {
	ExecOptions,
	ExecResult,
	Runtime,
	RuntimeFile,
} from "../core/types";

/** Fixed environment: the run log must stay readable and deterministic. */
const DEFAULT_ENV: Record<string, string> = {
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

const COI_MESSAGE =
	"WebContainers require cross-origin isolation. Serve the app with COOP/COEP headers (Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp) or load the COI service worker.";

type BootFunction = () => Promise<WebContainerInstance>;

/** One boot per module: every runtime instance shares the same container. */
let bootPromise: Promise<WebContainerInstance> | null = null;
let bootedContainer: WebContainerInstance | null = null;

function isDirectoryNode(
	node: FileSystemTree[string] | undefined,
): node is DirectoryNode {
	return node !== undefined && "directory" in node;
}

/**
 * Build a `FileSystemTree` from absolute file paths.
 *
 * The tree is mounted at `/`, so `/workspace/x/bundle/package.json` becomes
 * nested `workspace` → `x` → `bundle` → `package.json` nodes.
 */
function buildFileSystemTree(files: RuntimeFile[]): FileSystemTree {
	const root: FileSystemTree = {};

	for (const file of files) {
		const segments = file.path
			.split("/")
			.filter((segment) => segment.length > 0);

		if (segments.length === 0) {
			throw new Error(`Cannot mount file with an empty path.`);
		}

		const filename = segments.at(-1)!;
		let directory = root;

		for (const segment of segments.slice(0, -1)) {
			const existing = directory[segment];

			if (isDirectoryNode(existing)) {
				directory = existing.directory;
				continue;
			}

			if (existing !== undefined) {
				throw new Error(
					`Cannot mount "${file.path}": "${segment}" is already a file.`,
				);
			}

			const created: DirectoryNode = { directory: {} };
			directory[segment] = created;
			directory = created.directory;
		}

		directory[filename] = { file: { contents: file.contents } };
	}

	return root;
}

function assertCrossOriginIsolated(): void {
	if (!globalThis.crossOriginIsolated) {
		throw new Error(COI_MESSAGE);
	}
}

/**
 * Create a `Runtime` backed by WebContainers.
 *
 * The container boots lazily on first use and is shared for the lifetime of
 * the module. A failed boot is not cached, so a later run can retry.
 */
export function createWebContainerRuntime(
	boot: BootFunction = () => WebContainerClass.boot(),
): Runtime {
	function getContainer(): Promise<WebContainerInstance> {
		assertCrossOriginIsolated();

		if (bootPromise === null) {
			bootPromise = boot()
				.then((instance) => {
					bootedContainer = instance;
					return instance;
				})
				.catch((cause: unknown) => {
					bootPromise = null;
					throw cause;
				});
		}

		return bootPromise;
	}

	return {
		async mount(files: RuntimeFile[]): Promise<void> {
			const tree = buildFileSystemTree(files);
			const container = await getContainer();

			await container.mount(tree, { mountPoint: "/" });
		},

		async exec(
			command: string,
			args: string[],
			options: ExecOptions,
		): Promise<ExecResult> {
			const container = await getContainer();
			const process = await container.spawn(command, args, {
				cwd: options.cwd,
				env: { ...DEFAULT_ENV, ...options.env },
			});

			// Drain the stream even without a listener: an unconsumed output
			// stream can stall the process.
			const piped = process.output.pipeTo(
				new WritableStream<string>({
					write(chunk) {
						options.onOutput?.(chunk);
					},
				}),
			);

			const [exitCode] = await Promise.all([process.exit, piped]);

			return { exitCode };
		},

		async readText(path: string): Promise<string> {
			const container = await getContainer();
			return container.fs.readFile(path, "utf-8");
		},

		async writeText(path: string, contents: string): Promise<void> {
			const container = await getContainer();
			await container.fs.writeFile(path, contents, "utf-8");
		},

		async readBinary(path: string): Promise<Uint8Array> {
			const container = await getContainer();
			return container.fs.readFile(path);
		},

		async list(path: string): Promise<string[]> {
			const container = await getContainer();
			return container.fs.readdir(path);
		},

		async remove(path: string): Promise<void> {
			// A failed boot never produced a container. Cleanup must not boot one.
			if (bootedContainer === null) {
				return;
			}

			await bootedContainer.fs.rm(path, {
				recursive: true,
				force: true,
			});
		},
	};
}
