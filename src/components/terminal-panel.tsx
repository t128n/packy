import { useEffect, useRef } from "react";
import { type TerminalEntry, useTerminalEntries } from "@/lib/terminal";
import { cn } from "@/lib/utils";

function formatEntry(e: TerminalEntry) {
	const t = new Date(e.timestamp).toLocaleTimeString();
	const prefix =
		e.level === "error" ? "[error]" : e.level === "warn" ? "[warn]" : "[info]";
	return `${prefix} ${t} — ${e.text}`;
}

export function TerminalPanel() {
	const entries = useTerminalEntries();
	const containerRef = useRef<HTMLDivElement | null>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: The effect depends on the containerRef and entries.
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
		if (nearBottom) el.scrollTop = el.scrollHeight;
	}, [entries]);

	return (
		<section className="flex min-h-[60vh] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white">
			<div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2">
				<h2 className="text-sm font-semibold text-neutral-700">Output</h2>
				<div className="text-xs text-neutral-500">console</div>
			</div>

			<div
				ref={containerRef}
				className="relative flex-1 overflow-auto p-4 max-h-[70dvh]"
			>
				<pre
					className={cn(
						"whitespace-pre-wrap break-words text-sm leading-relaxed ",
						{
							"text-neutral-800": entries.length > 0,
							"text-neutral-500": entries.length === 0,
						},
					)}
				>
					{entries.length === 0
						? `$ Start bundling your npm package with packy 🎒`
						: entries.map((e) => formatEntry(e)).join("\n")}
				</pre>
			</div>
		</section>
	);
}
