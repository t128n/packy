import type { RunStage } from "./types";

type RunErrorDetails = {
	stage: RunStage;
	message: string;
	exitCode?: number;
	log?: string;
	cause?: unknown;
};

/** A run failure tagged with the stage that failed. */
export class RunError extends Error {
	readonly stage: RunStage;
	readonly exitCode?: number;
	readonly log?: string;

	constructor({ stage, message, exitCode, log, cause }: RunErrorDetails) {
		super(message, { cause });
		this.name = "RunError";
		this.stage = stage;
		this.exitCode = exitCode;
		this.log = log;
	}
}

export function isRunError(error: unknown): error is RunError {
	return error instanceof RunError;
}

export function toRunError(
	cause: unknown,
	stage: RunStage,
	log?: string,
): RunError {
	if (isRunError(cause)) {
		return cause;
	}

	const message = cause instanceof Error ? cause.message : String(cause);

	return new RunError({ stage, message, log, cause });
}
