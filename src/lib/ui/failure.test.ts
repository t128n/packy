import { describe, expect, test } from "bun:test";

import { describeFailure } from "./failure";

const error = {
	stage: "install" as const,
	message: "npm install failed",
	exitCode: 1,
};
describe("build failure guidance", () => {
	test("offers correction for an unavailable version", () => {
		expect(describeFailure(error, "npm ERR! code ETARGET").action).toBe(
			"edit",
		);
	});
	test("does not confuse DNS ENOTFOUND with a missing package", () => {
		expect(
			describeFailure(error, "getaddrinfo ENOTFOUND registry.npmjs.org"),
		).toEqual({
			message: "Could not reach npm. Check your connection and retry.",
			action: "retry",
		});
	});
	test("treats registry 404 as a selection error", () => {
		expect(describeFailure(error, "npm error code E404").action).toBe(
			"edit",
		);
	});
	test("states when cause is unknown", () => {
		expect(describeFailure(error, "").message).toContain("unknown");
	});
});
