import type {
	ExecOptions,
	ExecResult,
	Runtime,
	RuntimeFile,
} from "../core/types";

type FakeFileContents = string | Uint8Array;

/** One `exec` call recorded by the fake runtime. */
export type FakeExecCall = {
	command: string;
	args: string[];
	cwd: string;
	env: Record<string, string>;
};

/** What a command handler may return. Exit code defaults to 0. */
type FakeExecResult = {
	exitCode?: number;
	output?: string;
};

type FakeCommandHandler = (
	call: FakeExecCall,
	runtime: FakeRuntime,
) => FakeExecResult | void | Promise<FakeExecResult | void>;

type FakeRuntimeOptions = {
	files?: Record<string, FakeFileContents>;
	commandHandler?: FakeCommandHandler;
	/** When set, `mount` records the call and then rejects with this error. */
	mountError?: Error;
	/** When set, `remove` records the call and then rejects with this error. */
	removeError?: Error;
	/** When set, every read rejects with this error. */
	readError?: Error;
};

const decoder = new TextDecoder();
const encoder = new TextEncoder();

/** Normalize a fake path to an absolute, slash-prefixed path. */
function normalizePath(path: string): string {
	const segments = path.split("/").filter((segment) => segment.length > 0);
	return `/${segments.join("/")}`;
}

function isWithin(path: string, directory: string): boolean {
	return path === directory || path.startsWith(`${directory}/`);
}

/**
 * In-memory, dependency-free `Runtime` for tests.
 *
 * Every call is recorded so tests can assert the exact inputs the core used.
 * A command handler decides whether commands succeed and what they print;
 * tests can also write files from the handler to simulate npm.
 */
export class FakeRuntime implements Runtime {
	/** Current file system contents, keyed by normalized absolute path. */
	readonly files = new Map<string, FakeFileContents>();

	readonly mounts: RuntimeFile[][] = [];
	readonly calls: FakeExecCall[] = [];
	readonly writes: { path: string; contents: string }[] = [];
	readonly removed: string[] = [];
	readonly reads: string[] = [];
	readonly lists: string[] = [];

	commandHandler: FakeCommandHandler | undefined;
	mountError: Error | undefined;
	removeError: Error | undefined;
	readError: Error | undefined;

	constructor(options: FakeRuntimeOptions = {}) {
		this.commandHandler = options.commandHandler;
		this.mountError = options.mountError;
		this.removeError = options.removeError;
		this.readError = options.readError;

		for (const [path, contents] of Object.entries(options.files ?? {})) {
			this.put(path, contents);
		}
	}

	/** Write a file without going through the `Runtime` interface. */
	put(path: string, contents: FakeFileContents): void {
		this.files.set(normalizePath(path), contents);
	}

	/** Read a file without going through the `Runtime` interface. */
	get(path: string): FakeFileContents | undefined {
		return this.files.get(normalizePath(path));
	}

	/** Read a text file without going through the `Runtime` interface. */
	text(path: string): string {
		const contents = this.get(path);

		if (contents === undefined) {
			throw new Error(
				`ENOENT: no such file, open '${normalizePath(path)}'`,
			);
		}

		return typeof contents === "string"
			? contents
			: decoder.decode(contents);
	}

	has(path: string): boolean {
		return this.files.has(normalizePath(path));
	}

	async mount(files: RuntimeFile[]): Promise<void> {
		this.mounts.push(
			files.map((file) => ({
				path: normalizePath(file.path),
				contents: file.contents,
			})),
		);

		if (this.mountError !== undefined) {
			throw this.mountError;
		}

		for (const file of files) {
			this.put(file.path, file.contents);
		}
	}

	async exec(
		command: string,
		args: string[],
		options: ExecOptions,
	): Promise<ExecResult> {
		const call: FakeExecCall = {
			command,
			args: [...args],
			cwd: normalizePath(options.cwd),
			env: { ...options.env },
		};

		this.calls.push(call);

		const result = (await this.commandHandler?.(call, this)) ?? {};

		if (result.output !== undefined && result.output.length > 0) {
			options.onOutput?.(result.output);
		}

		return { exitCode: result.exitCode ?? 0 };
	}

	async readText(path: string): Promise<string> {
		const normalized = normalizePath(path);

		this.reads.push(normalized);

		if (this.readError !== undefined) {
			throw this.readError;
		}

		return this.text(normalized);
	}

	async writeText(path: string, contents: string): Promise<void> {
		const normalized = normalizePath(path);

		this.writes.push({ path: normalized, contents });
		this.put(normalized, contents);
	}

	async readBinary(path: string): Promise<Uint8Array> {
		const normalized = normalizePath(path);

		this.reads.push(normalized);

		if (this.readError !== undefined) {
			throw this.readError;
		}

		const contents = this.get(normalized);

		if (contents === undefined) {
			throw new Error(`ENOENT: no such file, open '${normalized}'`);
		}

		return typeof contents === "string"
			? encoder.encode(contents)
			: new Uint8Array(contents);
	}

	async list(path: string): Promise<string[]> {
		const directory = normalizePath(path);
		const entries = new Set<string>();

		this.lists.push(directory);

		for (const filePath of this.files.keys()) {
			if (!isWithin(filePath, directory) || filePath === directory) {
				continue;
			}

			const relative = filePath.slice(directory.length + 1);
			const [entry] = relative.split("/");

			if (entry !== undefined && entry.length > 0) {
				entries.add(entry);
			}
		}

		return [...entries].toSorted();
	}

	async remove(path: string): Promise<void> {
		const directory = normalizePath(path);

		this.removed.push(directory);

		if (this.removeError !== undefined) {
			throw this.removeError;
		}

		for (const filePath of this.files.keys()) {
			if (isWithin(filePath, directory)) {
				this.files.delete(filePath);
			}
		}
	}
}
