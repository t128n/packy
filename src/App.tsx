import { useEffect } from "react";
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
					<PackageBundlePanel onBundle={bundle} allowVersionSelection />
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
