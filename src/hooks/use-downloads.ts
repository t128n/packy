import { useContext } from "react";
import { DownloadContext, type DownloadContextValue } from "@/lib/downloads";

export function useDownloads(): DownloadContextValue {
	const ctx = useContext(DownloadContext);
	if (!ctx) {
		throw new Error("useDownloads must be used within a DownloadProvider");
	}
	return ctx;
}
