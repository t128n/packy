interface AppShellProps {
	children: React.ReactNode;
}

export function AppShell(props: AppShellProps) {
	const { children } = props;

	return (
		<div className="min-h-screen bg-background text-foreground antialiased">
			<div className="grid min-h-screen grid-rows-[auto_1fr_auto]">
				{children}
			</div>
		</div>
	);
}
