import type { RunStage } from "../core/types";

type Failure = { stage: RunStage; message: string; exitCode?: number };

const VERSION = /\bETARGET\b|no matching version/i;
const NETWORK = /\b(?:ENOTFOUND|ECONN\w*|ETIMEDOUT|EAI_AGAIN)\b|network/i;
const MISSING = /\bE404\b|404 not found/i;
const ISOLATION = /cross-origin isolation|COOP\/COEP/i;

export function describeFailure(
	error: Failure,
	log: string,
): { message: string; action: "edit" | "retry" } {
	if (VERSION.test(log))
		return {
			message:
				"This version is not available on npm. Choose another version.",
			action: "edit",
		};
	if (NETWORK.test(log))
		return {
			message: "Could not reach npm. Check your connection and retry.",
			action: "retry",
		};
	if (MISSING.test(log))
		return {
			message:
				"npm could not find this package. Check its name and version.",
			action: "edit",
		};
	if (ISOLATION.test(error.message))
		return { message: error.message, action: "retry" };
	return {
		message:
			"The bundle could not be created. The cause is unknown; review the technical details or retry.",
		action: "retry",
	};
}
