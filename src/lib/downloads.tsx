import {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export type DownloadEntry = {
		id: string; // unique
		name: string; // e.g. express-5.1.0.tgz
		url: string; // object URL backed by Blob from IDB
		size: number; // bytes (Blob.size)
		integrity?: string | null; // optional sha512 if you parse it
		createdAt: number; // epoch ms
		meta?: Record<string, string | number | boolean | null | undefined>;
	};

export type DownloadContextValue = {
		items: DownloadEntry[];
		addDownload: (
			entry: Omit<DownloadEntry, "id" | "createdAt" | "url" | "size"> & {
				blob: Blob; // pass blob to persist
				id?: string;
				createdAt?: number;
			},
		) => DownloadEntry; // return fully created entry
		removeDownload: (id: string) => void;
		clearDownloads: () => void;
	};

export const DownloadContext = createContext<DownloadContextValue | null>(null);

// IndexedDB helpers
const DB_NAME = "packy-downloads";
const DB_VERSION = 1;
const STORE_BLOBS = "blobs"; // key: id, value: Blob
const STORE_META = "meta"; // key: id, value: metadata without url
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type MetaRecord = {
	id: string;
	name: string;
	size: number;
	integrity: string | null;
	createdAt: number;
	meta?: Record<string, string | number | boolean | null | undefined>;
};

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_BLOBS)) {
				db.createObjectStore(STORE_BLOBS);
			}
			if (!db.objectStoreNames.contains(STORE_META)) {
				const store = db.createObjectStore(STORE_META, { keyPath: "id" });
				store.createIndex("createdAt", "createdAt", { unique: false });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

function idbPut(
	db: IDBDatabase,
	store: string,
	key: IDBValidKey,
	value: unknown,
) {
	return new Promise<void>((resolve, reject) => {
		const tx = db.transaction(store, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		const os = tx.objectStore(store);
		// blobs store uses the provided key, meta store uses value with keyPath
		if (store === STORE_BLOBS) {
			os.put(value as Blob, key);
		} else {
			os.put(value as MetaRecord);
		}
	});
}

function idbGet<T>(db: IDBDatabase, store: string, key: IDBValidKey) {
	return new Promise<T | undefined>((resolve, reject) => {
		const tx = db.transaction(store, "readonly");
		tx.onerror = () => reject(tx.error);
		const os = tx.objectStore(store);
		const req = os.get(key);
		req.onsuccess = () => resolve(req.result as T | undefined);
		req.onerror = () => reject(req.error);
	});
}

function idbDelete(db: IDBDatabase, store: string, key: IDBValidKey) {
	return new Promise<void>((resolve, reject) => {
		const tx = db.transaction(store, "readwrite");
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
		const os = tx.objectStore(store);
		os.delete(key);
	});
}

function idbGetAllMeta(db: IDBDatabase): Promise<MetaRecord[]> {
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_META, "readonly");
		const os = tx.objectStore(STORE_META);
		const req = os.getAll();
		req.onsuccess = () => resolve(req.result as MetaRecord[]);
		req.onerror = () => reject(req.error);
	});
}

function createObjectUrlSafe(blob: Blob): string {
	try {
		return URL.createObjectURL(blob);
	} catch {
		return "";
	}
}

export function DownloadProvider({ children }: { children: React.ReactNode }) {
	const [items, setItems] = useState<DownloadEntry[]>([]);
	const urlIndexRef = useRef<Map<string, string>>(new Map()); // url -> id
	const idIndexRef = useRef<Set<string>>(new Set());
	const dbRef = useRef<IDBDatabase | null>(null);

	// Hydrate from IDB on mount and cleanup expired entries
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const db = await openDb();
				dbRef.current = db;
				const all = await idbGetAllMeta(db);
				const now = Date.now();
				const expiredIds: string[] = [];
				const fresh: DownloadEntry[] = [];
				for (const rec of all) {
					if (now - rec.createdAt > RETENTION_MS) {
						expiredIds.push(rec.id);
						continue;
					}
					const blob = (await idbGet(db, STORE_BLOBS, rec.id)) as
						| Blob
						| undefined;
					if (!blob) {
						expiredIds.push(rec.id);
						continue;
					}
					const url = createObjectUrlSafe(blob);
					if (!url) continue;
					fresh.push({
						id: rec.id,
						name: rec.name,
						url,
						size: rec.size ?? blob.size,
						integrity: rec.integrity ?? null,
						createdAt: rec.createdAt,
						meta: rec.meta,
					});
				}
				// delete expired
				await Promise.all(
					expiredIds.map(async (id) => {
						await idbDelete(db, STORE_META, id);
						await idbDelete(db, STORE_BLOBS, id);
					}),
				);
				if (cancelled) return;
				setItems(fresh.sort((a, b) => b.createdAt - a.createdAt));
				// build indices
				for (const it of fresh) {
					urlIndexRef.current.set(it.url, it.id);
					idIndexRef.current.add(it.id);
				}
			} catch {
				// ignore IDB errors; operate in-memory only
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const addDownload: DownloadContextValue["addDownload"] = useCallback(
		(entry) => {
			const id =
				entry.id ??
				`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toLowerCase();
			const createdAt = entry.createdAt ?? Date.now();
			const blob = entry.blob;
			const size = blob.size;

			const metaRecord: MetaRecord = {
				id,
				name: entry.name,
				size,
				integrity: entry.integrity ?? null,
				createdAt,
				meta: entry.meta,
			};

			// persist to IDB (best-effort)
			(async () => {
				try {
					const db = dbRef.current ?? (await openDb());
					dbRef.current = db;
					// cleanup any expired before insert
					const all = await idbGetAllMeta(db);
					const now = Date.now();
					await Promise.all(
						all
							.filter((r) => now - r.createdAt > RETENTION_MS)
							.map(async (r) => {
								await idbDelete(db, STORE_META, r.id);
								await idbDelete(db, STORE_BLOBS, r.id);
							}),
					);
					await idbPut(db, STORE_BLOBS, id, blob);
					await idbPut(db, STORE_META, id, metaRecord);
				} catch {
					// ignore persistence errors
				}
			})();

			const url = createObjectUrlSafe(blob);
			const nextItem: DownloadEntry = {
				id,
				name: entry.name,
				url,
				size,
				integrity: entry.integrity ?? null,
				createdAt,
				meta: entry.meta,
			};

			setItems((prev) => {
				// avoid duplicates by id if already present
				if (idIndexRef.current.has(id)) return prev;
				idIndexRef.current.add(id);
				if (url) urlIndexRef.current.set(url, id);
				return [nextItem, ...prev];
			});

			return nextItem;
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
					idIndexRef.current.delete(id);
				}
				// remove from IDB best-effort
				(async () => {
					try {
						const db = dbRef.current ?? (await openDb());
						dbRef.current = db;
						await idbDelete(db, STORE_META, id);
						await idbDelete(db, STORE_BLOBS, id);
					} catch {}
				})();
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
				idIndexRef.current.delete(it.id);
			}
			// clear IDB
			(async () => {
				try {
					const db = dbRef.current ?? (await openDb());
					dbRef.current = db;
					const metas = await idbGetAllMeta(db);
					await Promise.all(
						metas.map(async (m) => {
							await idbDelete(db, STORE_META, m.id);
							await idbDelete(db, STORE_BLOBS, m.id);
						}),
					);
				} catch {}
			})();
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
