import { useEffect, useMemo, useRef } from "react";
import type { Stage } from "@/hooks/use-process";
import { cn } from "@/lib/utils";

function formatStageLine(s: Stage) {
	const t = s.startedAt
		? new Date(s.startedAt).toLocaleTimeString()
		: "--:--:--";
	const prefix =
		s.status === "error"
			? "[error]"
			: s.status === "done"
				? "[done]"
				: s.status === "active"
					? "[active]"
					: "[pending]";
	const note = s.note ? ` — ${s.note}` : "";
	return `${prefix} ${t} — ${s.label}${note}`;
}

export function TimelinePanel({ stages }: { stages: Stage[] }) {
	const containerRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: allow auto-scroll
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
		if (nearBottom) el.scrollTop = el.scrollHeight;
	}, [stages]);

	const lines = useMemo(() => stages.map(formatStageLine), [stages]);

	return (
		<section className="flex min-h-[20vh] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
			<div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
				<h2 className="text-sm font-semibold text-neutral-700">Process</h2>
				<div className="text-xs text-neutral-500">timeline</div>
			</div>

			<div
				ref={containerRef}
				className="relative flex-1 overflow-auto p-4 max-h-[40dvh]"
			>
				<pre
					className={cn(
						"whitespace-pre-wrap break-words text-sm leading-relaxed",
						{
							"text-neutral-800": lines.length > 0,
							"text-neutral-500": lines.length === 0,
						},
					)}
				>
					{lines.length === 0
						? `$ Follow the bundling process step-by-step`
						: lines.join("\n")}
				</pre>
			</div>
		</section>
	);
}
