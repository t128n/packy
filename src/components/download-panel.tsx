import { Download as DownloadIcon, Trash2 as TrashIcon } from "lucide-react";
import { useDownloads } from "@/hooks/use-downloads";
import { formatBytes, safeDownloadName } from "@/lib/downloads";

type DownloadPanelProps = {
	className?: string;
	title?: string;
};

export function DownloadPanel({
	className,
	title = "Downloads",
}: DownloadPanelProps) {
	const { items, removeDownload, clearDownloads } = useDownloads();

	return (
		<aside
			className={
				className ??
				"sticky top-[4.25rem] h-fit space-y-3 rounded-xl border border-border bg-card p-4"
			}
			aria-label={title}
		>
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-foreground">{title}</h2>
				<button
					type="button"
					onClick={clearDownloads}
					disabled={items.length === 0}
					className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-40"
				>
					Clear all
				</button>
			</div>

			{items.length === 0 ? (
				<p className="text-xs text-muted-foreground">No downloads yet.</p>
			) : (
				<ul className="space-y-2">
					{items.map((it) => (
						<li
							key={it.id}
							className="rounded-lg border border-border p-3 hover:bg-muted/40"
						>
							<div className="min-w-0">
								<div className="truncate text-sm font-medium text-foreground">
									{it.name}
								</div>
								<div className="mt-0.5 text-[11px] text-muted-foreground">
									({formatBytes(it.size)})
								</div>
							</div>

							<div className="mt-2 flex items-center gap-2">
								<a
									href={it.url}
									download={safeDownloadName(it.name)}
									className="inline-flex items-center gap-1 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background hover:opacity-90"
								>
									<DownloadIcon size={14} />
									Download
								</a>

								<button
									type="button"
									onClick={() => removeDownload(it.id)}
									className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-destructive/10 hover:text-destructive"
									aria-label={`Delete ${it.name}`}
									title="Delete"
								>
									<TrashIcon size={14} />
									Delete
								</button>
							</div>
						</li>
					))}
				</ul>
			)}
		</aside>
	);
}
