import { useWebContainer } from "react-webcontainers";
import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { AppShell } from "@/components/app-shell";
import { DownloadPanel } from "@/components/download-panel";
import { PackageBundlePanel } from "@/components/package-bundle-panel";
import { TerminalPanel } from "@/components/terminal-panel";
import { TimelinePanel } from "@/components/timeline-panel";
import { WebcontainerUnsupportedAlert } from "@/components/webcontainer-unsupported-alert";
import { useBundler } from "@/hooks/use-bundler";

export function App() {
	const wc = useWebContainer();
	const { bundle, stages } = useBundler();

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
		</AppShell>
	);
}
