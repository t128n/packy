import { SiGithub } from "@icons-pack/react-simple-icons";
import { BookTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppHeader() {
	return (
		<header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 backdrop-blur">
			<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
				<div className="flex items-center gap-3">
					<div
						className="flex h-8 w-8 items-center justify-center rounded bg-red-100"
						aria-hidden="true"
					>
						🎒
					</div>

					<div className="flex flex-col">
						<h1 className="text-lg font-semibold leading-tight">packy</h1>
						<p className="text-xs text-neutral-500">web npm package bundler</p>
					</div>
				</div>

				<nav className="flex items-center gap-3">
					<Button asChild variant="ghost" size="sm">
						<a
							href="https://github.com/t128n/packy"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2"
						>
							<SiGithub className="h-4 w-4" aria-hidden="true" />
							<span>GitHub</span>
						</a>
					</Button>

					<Button asChild size="sm">
						<a
							href="https://github.com/t128n/packy"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-2"
						>
							<BookTextIcon className="h-4 w-4" aria-hidden="true" />
							<span>Docs</span>
						</a>
					</Button>
				</nav>
			</div>
		</header>
	);
}
