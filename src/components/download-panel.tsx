import { useDownloads } from "@/hooks/use-downloads";
import { formatBytes, safeDownloadName, shortHash } from "@/lib/downloads";

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
				"sticky top-[4.25rem] h-fit space-y-3 rounded-lg border border-neutral-200 bg-white p-4"
			}
		>
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-neutral-700">{title}</h2>
				<button
					type="button"
					className="text-xs text-neutral-500 hover:text-neutral-800"
					onClick={clearDownloads}
					disabled={items.length === 0}
					title="Clear all"
				>
					Clear all
				</button>
			</div>

			{items.length === 0 ? (
				<p className="text-xs text-neutral-500">No downloads yet.</p>
			) : (
				<ul className="space-y-2">
					{items.map((it) => (
						<li
							key={it.id}
							className="rounded-md border border-neutral-200 p-3"
						>
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<div className="truncate text-sm font-medium text-neutral-800">
										{it.name}
									</div>
									<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
										<span>{formatBytes(it.size)}</span>
										<span>•</span>
										<span>
											{new Date(it.createdAt).toLocaleString(undefined, {
												hour12: false,
											})}
										</span>
										{it.integrity ? (
											<>
												<span>•</span>
												<span title={it.integrity}>
													sha512 {shortHash(it.integrity)}
												</span>
											</>
										) : null}
										{it.meta
											? Object.entries(it.meta)
													.filter(([, v]) => v !== undefined && v !== null)
													.slice(0, 3)
													.map(([k, v]) => (
														<span key={k} className="truncate">
															• {k}: {String(v)}
														</span>
													))
											: null}
									</div>
								</div>

								<div className="flex shrink-0 items-center gap-2">
									<a
										href={it.url}
										download={safeDownloadName(it.name)}
										className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
										title="Download"
									>
										Download
									</a>
									<button
										type="button"
										className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
										onClick={() => removeDownload(it.id)}
										title="Remove"
									>
										Remove
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
		</aside>
	);
}
