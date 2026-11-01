/** One attempt to produce an archive. */
export type RunStage = "prepare" | "install" | "patch" | "pack" | "capture";

/** The single package reference a run accepts. */
export type PackageReference = {
	name: string;
	versionSpec: string;
};

/** A text file mounted into the runtime workspace. */
export type RuntimeFile = {
	path: string;
	contents: string;
};

export type ExecOptions = {
	cwd: string;
	env?: Record<string, string>;
	onOutput?: (chunk: string) => void;
};

export type ExecResult = {
	exitCode: number;
};

/**
 * The only surface the core needs from the browser runtime.
 *
 * The production adapter uses WebContainers. Tests use an in-memory fake.
 */
export type Runtime = {
	mount(files: RuntimeFile[]): Promise<void>;
	exec(
		command: string,
		args: string[],
		options: ExecOptions,
	): Promise<ExecResult>;
	readText(path: string): Promise<string>;
	writeText(path: string, contents: string): Promise<void>;
	readBinary(path: string): Promise<Uint8Array>;
	list(path: string): Promise<string[]>;
	remove(path: string): Promise<void>;
};

/** Everything a successful run returns. The caller owns the Blob/URL. */
export type RunResult = {
	bytes: Uint8Array;
	filename: string;
	name: string;
	version: string;
	log: string;
};

export type RunCallbacks = {
	onStage?: (stage: RunStage) => void;
	onLog?: (chunk: string) => void;
};

export type RunOptions = RunCallbacks & {
	runtime: Runtime;
	reference: PackageReference;
};
