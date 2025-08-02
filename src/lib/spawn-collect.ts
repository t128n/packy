import type { WebContainer } from "@webcontainer/api";

export type SpawnResult = {
	code: number;
	stdout: string;
	stderr: string;
};

export async function spawnCollect({
	wc,
	cmd,
	args,
	cwd,
	env,
}: {
	wc: WebContainer | null | undefined;
	cmd: string;
	args: string[];
	cwd?: string;
	env?: Record<string, string>;
}): Promise<SpawnResult> {
	if (!wc) throw new Error("WebContainer is not initialized");

	const proc = await wc.spawn(cmd, args, { cwd, env });
	let stdout = "";
	let stderr = "";

	proc.output.pipeTo(
		new WritableStream({
			write(data) {
				stdout += data;
			},
		}),
	);

	// @ts-expect-error: stderr may exist depending on runtime
	if (proc.stderr?.pipeTo) {
		// @ts-expect-error: stderr may exist depending on runtime
		await proc.stderr.pipeTo(
			new WritableStream({
				write(data: string) {
					stderr += data;
				},
			}),
		);
	}

	const code = await proc.exit;
	return { code, stdout, stderr };
}
