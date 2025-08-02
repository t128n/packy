import { useCallback, useMemo, useRef, useState } from "react";

export type StageId =
	| "boot"
	| "setup"
	| "install"
	| "patch"
	| "pack"
	| "done"
	| "error";

export type Stage = {
	id: StageId;
	label: string;
	startedAt?: number;
	finishedAt?: number;
	status: "pending" | "active" | "done" | "error";
	note?: string;
};

const ORDER: StageId[] = ["boot", "setup", "install", "patch", "pack", "done"];

const LABEL: Record<StageId, string> = {
	boot: "Booting up",
	setup: "Setting up environment",
	install: "Installing package",
	patch: "Patching package.json",
	pack: "Creating tarball",
	done: "Done",
	error: "Error",
};

export function useProcessTimeline() {
	const initial = useMemo<Stage[]>(
		() =>
			ORDER.map((id) => ({
				id,
				label: LABEL[id],
				status: "pending",
			})),
		[],
	);

	const [stages, setStages] = useState<Stage[]>(initial);
	const current = useRef<number>(-1);

	const reset = useCallback(() => {
		setStages((prev) =>
			prev.map((s) => ({
				...s,
				status: "pending",
				startedAt: undefined,
				finishedAt: undefined,
				note: undefined,
			})),
		);
		current.current = -1;
	}, []);

	const start = useCallback((id: StageId) => {
		setStages((prev) => {
			const idx = prev.findIndex((s) => s.id === id);
			if (idx === -1) return prev;
			current.current = idx;
			return prev.map((s, i) =>
				i === idx ? { ...s, status: "active", startedAt: Date.now() } : s,
			);
		});
	}, []);

	const succeed = useCallback((id: StageId, note?: string) => {
		setStages((prev) =>
			prev.map((s) =>
				s.id === id
					? {
							...s,
							status: "done",
							finishedAt: Date.now(),
							note: note ?? s.note,
						}
					: s,
			),
		);
	}, []);

	const fail = useCallback((id: StageId, note?: string) => {
		setStages((prev) => {
			const updated = prev.map((s) =>
				s.id === id
					? {
							...s,
							status: "error" as const,
							finishedAt: Date.now(),
							note: note ?? s.note,
						}
					: s,
			);
			if (prev.some((s) => s.id === "error")) {
				return updated;
			}
			return [
				...updated,
				{
					id: "error",
					label: LABEL.error,
					status: "error" as const,
					startedAt: Date.now(),
					finishedAt: Date.now(),
					note,
				},
			];
		});
	}, []);

	return { stages, reset, start, succeed, fail };
}
