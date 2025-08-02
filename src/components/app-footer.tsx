import { SiGithub, SiX } from "@icons-pack/react-simple-icons";

export function AppFooter() {
	// Read the injected commit SHA; fall back to undefined in dev
	const sha = typeof __COMMIT_SHA__ !== "undefined" ? (__COMMIT_SHA__ as string) : undefined;
	const shortSha = sha && sha !== "dev" ? sha.slice(0, 7) : undefined;
	const commitUrl = shortSha ? `https://github.com/t128n/packy/commit/${sha}` : "https://github.com/t128n/packy";

	return (
		<footer className="border-t border-border bg-background">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
				<div className="flex items-center gap-2">
					<span>© {new Date().getFullYear()} Torben Haack</span>
					<span className="text-muted-foreground/70">[t128n]</span>
					<a
						href="https://t128.github.io"
						target="_blank"
						rel="noreferrer"
						className="hover:text-foreground"
						aria-label="t128.github.io"
					>
						t128.github.io
					</a>
					{shortSha && (
						<a
							href={commitUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 hover:text-foreground"
							aria-label={`Deployed commit ${shortSha}`}
						>
							<span className="text-muted-foreground/70">•</span>
							<span className="font-mono">{shortSha}</span>
						</a>
					)}
				</div>

				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<a
							href="https://github.com/t128n/packy"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 hover:text-foreground"
							aria-label="GitHub repository"
						>
							<SiGithub className="h-3.5 w-3.5" aria-hidden="true" />
							<span className="sr-only">GitHub</span>
						</a>
						<a
							href="https://twitter.com/_t128n"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 hover:text-foreground"
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
