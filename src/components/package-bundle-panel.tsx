"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
	initialSpecifier?: string; // optional prefill like "react@18.2.0" or "react@latest"
};

export function PackageBundlePanel({
	onBundle,
	allowVersionSelection = true,
	initialSpecifier,
}: Props) {
	// Mode: "registry" for npm registry search, "manual" for manual entry
	const [mode, setMode] = useState<"registry" | "manual">("registry");
	
	// Package search (registry mode)
	const [pkgQuery, setPkgQuery] = useState("");
	const [pkgResults, setPkgResults] = useState<NpmPkg[]>([]);
	const [pkgLoading, setPkgLoading] = useState(false);
	const [selectedPkg, setSelectedPkg] = useState<NpmPkg | null>(null);
	const debQ = useDebounced(pkgQuery, 300);

	// Manual entry mode
	const [manualPkgName, setManualPkgName] = useState("");
	const [manualVersion, setManualVersion] = useState("");

	// Registry search effect
	useEffect(() => {
		if (mode !== "registry") return;
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
	}, [debQ, mode]);

	// Prefill from initialSpecifier (runs once per prop value)
	const prefillDone = useRef<string | null>(null);
	useEffect(() => {
		if (!initialSpecifier) return;
		if (prefillDone.current === initialSpecifier) return;
		prefillDone.current = initialSpecifier;
		// Parse name@version (support scoped)
		const at = initialSpecifier.lastIndexOf("@");
		let name = initialSpecifier;
		let version: string | null = null;
		if (at > 0) {
			name = initialSpecifier.slice(0, at);
			version = initialSpecifier.slice(at + 1) || null;
		}
		
		// For initial specifier, start in registry mode and try to search
		setMode("registry");
		setPkgQuery(name);
		setManualPkgName(name);
		if (version) {
			setManualVersion(version);
		}
		
		// Perform an immediate search to resolve the package meta and set selection
		(async () => {
			try {
				const results = await searchNpm(name);
				setPkgResults(results);
				const match =
					results.find((p) => p.name === name) ?? results[0] ?? null;
				if (match) {
					setSelectedPkg(match);
					// If version specified, set selectedVersion (or let versions effect default to latest)
					if (version) setSelectedVersion(version);
				} else {
					// If not found in registry, switch to manual mode
					setMode("manual");
				}
			} catch {
				// If search fails, switch to manual mode
				setMode("manual");
			}
		})();
	}, [initialSpecifier]);

	// Version selection (for registry mode)
	const [verQuery, setVerQuery] = useState("");
	const [versions, setVersions] = useState<NpmVersion[]>([]);
	const [verLoading, setVerLoading] = useState(false);
	const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
	const debVerQ = useDebounced(verQuery, 200);

	useEffect(() => {
		if (!allowVersionSelection || mode !== "registry") return;
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
				// Respect pre-selected version if it exists
				setSelectedVersion((prev) => prev ?? latest);
				setVerLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [allowVersionSelection, selectedPkg?.name, selectedPkg?.version, mode]);

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

		const resolvedPackage = useMemo(() => {
			if (mode === "manual") {
				return manualPkgName.trim() ? { name: manualPkgName.trim(), version: manualVersion.trim() || "latest" } : null;
			} else {
				return selectedPkg ? { name: selectedPkg.name, version: resolvedVersion || selectedPkg.version } : null;
			}
		}, [mode, manualPkgName, manualVersion, selectedPkg, resolvedVersion]);

	return (
		<aside className="sticky top-[4.25rem] h-fit space-y-4 rounded-lg border border-border bg-card p-4">
			<div className="flex items-center justify-between">
				<h2 className="text-sm font-semibold text-foreground">
					Bundle Package
				</h2>
				<div className="flex rounded-md border border-input">
					<Button
						type="button"
						variant={mode === "registry" ? "default" : "ghost"}
						size="sm"
						className="rounded-r-none px-3 py-1 text-xs"
						onClick={() => setMode("registry")}
					>
						Registry Search
					</Button>
					<Button
						type="button"
						variant={mode === "manual" ? "default" : "ghost"}
						size="sm"
						className="rounded-l-none border-l px-3 py-1 text-xs"
						onClick={() => setMode("manual")}
					>
						Manual Entry
					</Button>
				</div>
			</div>

			<div className="space-y-3">
				{mode === "registry" ? (
					<>
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
					</>
				) : (
					<>
						<div className="space-y-2">
							<Label htmlFor="manual-package-name" className="text-xs text-neutral-600">
								Package Name
							</Label>
							<Input
								id="manual-package-name"
								placeholder="e.g., react, @types/node"
								value={manualPkgName}
								onChange={(e) => setManualPkgName(e.target.value)}
							/>
							<p className="text-xs text-neutral-500">
								Enter any package name, including deprecated or custom packages
							</p>
						</div>

						{allowVersionSelection && (
							<div className="space-y-2">
								<Label htmlFor="manual-version" className="text-xs text-neutral-600">
									Version
								</Label>
								<Input
									id="manual-version"
									placeholder="e.g., 18.2.0, latest, ^1.0.0"
									value={manualVersion}
									onChange={(e) => setManualVersion(e.target.value)}
								/>
								<p className="text-xs text-neutral-500">
									Leave empty to use "latest"
								</p>
							</div>
						)}
					</>
				)}

				<div className="flex items-center gap-2">
					<Button
						type="button"
						className="px-3"
						disabled={!resolvedPackage}
						onClick={() => {
							if (resolvedPackage) {
								onBundle({
									name: resolvedPackage.name,
									version: resolvedPackage.version,
								});
							}
						}}
					>
						Bundle
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							// Clear registry mode state
							setPkgQuery("");
							setPkgResults([]);
							setSelectedPkg(null);
							setVerQuery("");
							setVersions([]);
							setSelectedVersion(null);
							// Clear manual mode state
							setManualPkgName("");
							setManualVersion("");
						}}
					>
						Clear
					</Button>
				</div>
			</div>
		</aside>
	);
	}
