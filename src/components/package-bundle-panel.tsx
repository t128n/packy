"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { useDebounced } from "@/hooks/use-debounced";
import {
	getPackageVersions,
	type NpmPkg,
	type NpmVersion,
	searchNpm,
} from "@/lib/npm";

type Props = {
	onBundle: (pkg: { name: string; version: string }) => void;
	allowVersionSelection?: boolean; // optional
};

export function PackageBundlePanel({
	onBundle,
	allowVersionSelection = true,
}: Props) {
	// Package search
	const [pkgQuery, setPkgQuery] = useState("");
	const [pkgResults, setPkgResults] = useState<NpmPkg[]>([]);
	const [pkgLoading, setPkgLoading] = useState(false);
	const [selectedPkg, setSelectedPkg] = useState<NpmPkg | null>(null);
	const debQ = useDebounced(pkgQuery, 300);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			if (!debQ) {
				setPkgResults([]);
				return;
			}
			setPkgLoading(true);
			const r = await searchNpm(debQ);
			if (!cancelled) {
				setPkgResults(r);
				setPkgLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [debQ]);

	// Versions
	const [verQuery, setVerQuery] = useState("");
	const [versions, setVersions] = useState<NpmVersion[]>([]);
	const [verLoading, setVerLoading] = useState(false);
	const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
	const debVerQ = useDebounced(verQuery, 200);

	useEffect(() => {
		if (!allowVersionSelection) return;
		let cancelled = false;
		(async () => {
			if (!selectedPkg?.name) {
				setVersions([]);
				setSelectedVersion(null);
				return;
			}
			setVerLoading(true);
			const vs = await getPackageVersions(selectedPkg.name);
			if (!cancelled) {
				setVersions(vs);
				// Default to latest tag if present, else use the package's default
				const latest =
					vs.find((v) => v.tags?.includes("latest"))?.version ??
					selectedPkg.version ??
					null;
				setSelectedVersion(latest);
				setVerLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [allowVersionSelection, selectedPkg?.name, selectedPkg?.version]);

	const filteredVersions = useMemo(() => {
		if (!debVerQ.trim()) return versions;
		const q = debVerQ.toLowerCase();
		return versions.filter(
			(v) =>
				v.version.toLowerCase().includes(q) ||
				v.tags?.some((t) => t.toLowerCase().includes(q)),
		);
	}, [versions, debVerQ]);

	const resolvedVersion = useMemo(() => {
		// If version selection is disabled, always use the package default (from search)
		if (!allowVersionSelection) return selectedPkg?.version ?? null;
		// If enabled, prefer explicit selection, else fallback to package’s default
		return selectedVersion ?? selectedPkg?.version ?? null;
	}, [allowVersionSelection, selectedPkg?.version, selectedVersion]);

	return (
		<aside className="sticky top-[4.25rem] h-fit space-y-4 rounded-lg border border-border bg-card p-4">
			<h2 className="text-sm font-semibold text-foreground">Bundle Package</h2>

			<div className="space-y-3">
				<Combobox<NpmPkg>
					label="Package"
					placeholder="Search npm…"
					items={pkgResults}
					value={selectedPkg}
					loading={pkgLoading}
					onSearch={setPkgQuery}
					onSelect={(pkg) => {
						setSelectedPkg(pkg);
						setVerQuery("");
						setSelectedVersion(null);
						setVersions([]);
					}}
					getKey={(p) => p.name}
					getLabel={(p) => `${p.name}@${p.version}`}
					getDescription={(p) => p.description}
				/>

				{allowVersionSelection ? (
					<Combobox<{ version: string; tags?: string[] }>
						label="Version"
						placeholder="Filter versions…"
						items={filteredVersions}
						value={
							selectedVersion
								? { version: selectedVersion }
								: selectedPkg
									? { version: selectedPkg.version }
									: null
						}
						loading={verLoading}
						onSearch={setVerQuery}
						onSelect={(v) => setSelectedVersion(v.version)}
						getKey={(v) => v.version}
						getLabel={(v) =>
							v.tags && v.tags.length > 0
								? `${v.version} (${v.tags.slice(0, 2).join(", ")})`
								: v.version
						}
					/>
				) : null}

				<div className="flex items-center gap-2">
					<Button
						type="button"
						className="px-3"
						disabled={!selectedPkg || !resolvedVersion}
						onClick={() => {
							if (selectedPkg && resolvedVersion) {
								onBundle({ name: selectedPkg.name, version: resolvedVersion });
							}
						}}
					>
						Bundle
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							setPkgQuery("");
							setPkgResults([]);
							setSelectedPkg(null);
							setVerQuery("");
							setVersions([]);
							setSelectedVersion(null);
						}}
					>
						Clear
					</Button>
				</div>
			</div>
		</aside>
	);
}
