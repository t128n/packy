import { SiGithub, SiX } from "@icons-pack/react-simple-icons";
export function AppFooter() {
	return (
		<footer className="border-t border-neutral-200 bg-white">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 text-xs text-neutral-600 md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-2">
					<span>© {new Date().getFullYear()} Torben Haack</span>
					<span className="text-neutral-400">[t128n]</span>
				</div>

				<div className="flex items-center gap-4">
					<nav className="flex items-center gap-3">
						<a href="/status" className="hover:underline">
							Status
						</a>
						<a href="/privacy" className="hover:underline">
							Privacy
						</a>
						<a href="/terms" className="hover:underline">
							Terms
						</a>
					</nav>

					<div className="hidden h-4 w-px bg-neutral-200 md:block" />

					<div className="flex items-center gap-2">
						<a
							href="https://github.com/t128n/packy"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 hover:text-neutral-800"
							aria-label="GitHub repository"
						>
							<SiGithub className="h-3.5 w-3.5" aria-hidden="true" />
							<span className="sr-only">GitHub</span>
						</a>
						<a
							href="https://twitter.com/_t128n"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 hover:text-neutral-800"
							aria-label="Twitter profile"
						>
							<SiX className="h-3.5 w-3.5" aria-hidden="true" />
							<span className="sr-only">Twitter</span>
						</a>
					</div>
				</div>
			</div>
		</footer>
	);
}
