import { createContext, useCallback, useMemo, useRef, useState } from "react";

export type DownloadEntry = {
	id: string; // unique
	name: string; // e.g. express-5.1.0.tgz
	url: string; // object URL
	size: number; // bytes (Blob.size)
	integrity?: string | null; // optional sha512 if you parse it
	createdAt: number; // epoch ms
	meta?: Record<string, string | number | boolean | null | undefined>;
};

export type DownloadContextValue = {
	items: DownloadEntry[];
	addDownload: (
		entry: Omit<DownloadEntry, "id" | "createdAt"> & {
			id?: string;
			createdAt?: number;
		},
	) => string;
	removeDownload: (id: string) => void;
	clearDownloads: () => void;
};

export const DownloadContext = createContext<DownloadContextValue | null>(null);

export function DownloadProvider({ children }: { children: React.ReactNode }) {
	const [items, setItems] = useState<DownloadEntry[]>([]);
	const urlIndexRef = useRef<Map<string, string>>(new Map()); // url -> id

	const addDownload: DownloadContextValue["addDownload"] = useCallback(
		(entry) => {
			const id =
				entry.id ??
				`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
			const createdAt = entry.createdAt ?? Date.now();

			setItems((prev) => {
				// avoid duplicates by URL
				const existingId = urlIndexRef.current.get(entry.url);
				if (existingId) return prev;

				const next = [
					{
						id,
						name: entry.name,
						url: entry.url,
						size: entry.size,
						integrity: entry.integrity ?? null,
						createdAt,
						meta: entry.meta,
					},
					...prev,
				];
				urlIndexRef.current.set(entry.url, id);
				return next;
			});

			return id;
		},
		[],
	);

	const removeDownload: DownloadContextValue["removeDownload"] = useCallback(
		(id) => {
			setItems((prev) => {
				const found = prev.find((x) => x.id === id);
				if (found) {
					try {
						URL.revokeObjectURL(found.url);
					} catch {}
					urlIndexRef.current.delete(found.url);
				}
				return prev.filter((x) => x.id !== id);
			});
		},
		[],
	);

	const clearDownloads = useCallback(() => {
		setItems((prev) => {
			for (const it of prev) {
				try {
					URL.revokeObjectURL(it.url);
				} catch {}
				urlIndexRef.current.delete(it.url);
			}
			return [];
		});
	}, []);

	const value = useMemo<DownloadContextValue>(
		() => ({ items, addDownload, removeDownload, clearDownloads }),
		[items, addDownload, removeDownload, clearDownloads],
	);

	return (
		<DownloadContext.Provider value={value}>
			{children}
		</DownloadContext.Provider>
	);
}

export function formatBytes(n: number): string {
	if (!Number.isFinite(n) || n < 0) return "—";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	let s = n;
	while (s >= 1024 && i < units.length - 1) {
		s /= 1024;
		i++;
	}
	return `${s.toFixed(s < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function shortHash(h?: string | null, len = 16): string {
	if (!h) return "—";
	const clean = h.replace(/^sha\d+-/i, "");
	return clean.length > len ? `${clean.slice(0, len)}…` : clean;
}

export function safeDownloadName(name: string): string {
	return name.replace(/[^A-Za-z0-9._@-]/g, "_");
}
