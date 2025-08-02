import { useEffect, useRef } from "react";
import type { Stage } from "@/hooks/use-process";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: Stage["status"] }) {
	const map: Record<Stage["status"], string> = {
		pending: "bg-muted text-muted-foreground",
		active: "bg-blue-600/15 text-blue-600",
		done: "bg-emerald-600/15 text-emerald-600",
		error: "bg-red-600/15 text-red-600",
	};
	const label: Record<Stage["status"], string> = {
		pending: "pending",
		active: "active",
		done: "done",
		error: "error",
	};
	return (
		<span
			className={cn(
				"inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
				map[status],
			)}
		>
			{label[status]}
		</span>
	);
}

function TimelineDot({ status }: { status: Stage["status"] }) {
	const color =
		status === "error"
			? "bg-red-600 border-red-600"
			: status === "done"
				? "bg-emerald-600 border-emerald-600"
				: status === "active"
					? "bg-blue-600 border-blue-600 animate-pulse"
					: "bg-muted-foreground/40 border-border";
	return (
		<div
			className={cn("relative z-10 h-2.5 w-2.5 rounded-full border", color)}
		/>
	);
}

function TimelineItem({ s, isLast }: { s: Stage; isLast: boolean }) {
	const time = s.startedAt
		? new Date(s.startedAt).toLocaleTimeString()
		: "--:--:--";
	return (
		<li className="relative grid grid-cols-[16px_1fr] gap-3">
			{/* vertical line */}
			<div className="flex flex-col items-center">
				<TimelineDot status={s.status} />
				{!isLast && <div className="mt-1 h-full w-px bg-border" />}
			</div>
			<div className="pb-3">
				<div className="flex flex-wrap items-center gap-2">
					<StatusBadge status={s.status} />
					<div className="text-sm font-medium text-foreground">{s.label}</div>
					<div className="text-xs text-muted-foreground">{time}</div>
				</div>
				{s.note && (
					<div className="mt-1 text-xs text-muted-foreground">{s.note}</div>
				)}
			</div>
		</li>
	);
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

	const hasItems = stages.length > 0;

	return (
		<section className="flex min-h-[20vh] flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<h2 className="text-sm font-semibold text-foreground">Process</h2>
				<div className="text-xs text-muted-foreground">timeline</div>
			</div>

			<div
				ref={containerRef}
				className="relative flex-1 overflow-auto p-4 max-h-[40dvh]"
			>
				{!hasItems ? (
					<div className="flex h-full flex-col items-center justify-center gap-2 text-center">
						<div className="text-sm text-muted-foreground">
							Follow the bundling process step-by-step.
						</div>
						<div className="text-xs text-muted-foreground">
							This panel will show each stage with timestamps and status.
						</div>
					</div>
				) : (
					<ol className="relative space-y-2">
						{stages.map((s, i) => (
							<TimelineItem
								key={`${s.label}-${i}`}
								s={s}
								isLast={i === stages.length - 1}
							/>
						))}
					</ol>
				)}
			</div>
		</section>
	);
}
