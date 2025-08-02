import { useEffect, useMemo, useRef } from "react";
import { useWebContainer } from "react-webcontainers";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { DownloadPanel } from "@/components/download-panel";
import {
	OnboardingDialog,
	useOnboardingState,
} from "@/components/onboarding-dialog";
import { PackageBundlePanel } from "@/components/package-bundle-panel";
import { TerminalPanel } from "@/components/terminal-panel";
import { TimelinePanel } from "@/components/timeline-panel";
import { WebcontainerUnsupportedAlert } from "@/components/webcontainer-unsupported-alert";
import { useBundler } from "@/hooks/use-bundler";

export function App() {
	const wc = useWebContainer();
	const { bundle, stages } = useBundler();
	const onboarding = useOnboardingState();

	// Read ?pkg=name[@version] once
	const urlPkg = useMemo(() => {
		try {
			const qp = new URLSearchParams(window.location.search);
			const spec = qp.get("pkg")?.trim();
			if (!spec) return null;
			// split last @ as version separator (supports scoped packages)
			const at = spec.lastIndexOf("@");
			if (at <= 0) {
				// No explicit version -> default to latest
				return { name: spec, version: "latest" } as const;
			}
			if (at === spec.length - 1) {
				// Trailing @ -> treat as no version
				return { name: spec.slice(0, -1), version: "latest" } as const;
			}
			const name = spec.slice(0, at);
			const version = spec.slice(at + 1);
			if (!name) return null;
			return { name, version: version || "latest" } as const;
		} catch {
			return null;
		}
	}, []);
	const autoTriggered = useRef(false);

	// Auto-trigger bundling when URL contains ?pkg= and WC is available
	useEffect(() => {
		if (autoTriggered.current) return;
		if (!urlPkg) return;
		if (!wc) return;
		autoTriggered.current = true;
		import("sonner").then(({ toast }) =>
			toast.message(`Auto bundling ${urlPkg.name}@${urlPkg.version}…`, {
				description:
					"Loaded from URL parameter. Watch the panels for progress.",
			}),
		);
		bundle({ name: urlPkg.name, version: urlPkg.version });
	}, [wc, bundle, urlPkg]);

	// When bundling starts/finishes, show small tips
	useEffect(() => {
		const last = stages[stages.length - 1];
		if (!last) return;
		if (last.status === "active") {
			import("sonner").then(({ toast }) =>
				toast.message("Bundling in progress…", {
					description: "Watch the Timeline and Terminal panels for updates.",
				}),
			);
		}
		if (last.status === "done") {
			import("sonner").then(({ toast }) =>
				toast.success("Bundle ready", {
					description: "Open the Downloads panel to save your archive.",
				}),
			);
		}
		if (last.status === "error") {
			import("sonner").then(({ toast }) =>
				toast.error("Bundling failed", {
					description: "Check the Terminal for details and try again.",
				}),
			);
		}
	}, [stages]);

	return (
		<AppShell>
			<AppHeader />
			<main className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-[320px_1fr]">
				<WebcontainerUnsupportedAlert wc={wc} />
				<div className="flex flex-col gap-6">
					<PackageBundlePanel
						onBundle={bundle}
						allowVersionSelection
						initialSpecifier={
							urlPkg ? `${urlPkg.name}@${urlPkg.version}` : undefined
						}
					/>
					<DownloadPanel />
					<TimelinePanel stages={stages} />
				</div>
				<TerminalPanel />
			</main>
			<AppFooter />

			{/* Onboarding dialog */}
			<OnboardingDialog
				open={onboarding.open}
				onOpenChange={(o) => {
					onboarding.setOpen(o);
					if (!o) localStorage.setItem("packy:onboarding:v1", "1");
				}}
				index={onboarding.index}
				onNext={onboarding.actions.next}
				onPrev={onboarding.actions.prev}
				onSkip={onboarding.actions.skip}
			/>
		</AppShell>
	);
}
