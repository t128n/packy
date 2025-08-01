import { Badge } from "@/components/ui/badge";
import { type SwStatus, useSwStatus } from "@/hooks/use-sw-status";

export function SwBadge() {
	const status = useSwStatus();

	const map: Record<
		SwStatus,
		{ label: string; variant?: "default" | "secondary" | "destructive" | null }
	> = {
		unsupported: { label: "SW n/a", variant: "secondary" },
		insecure: { label: "Insecure", variant: "destructive" },
		unregistered: { label: "Registering…", variant: "secondary" },
		installing: { label: "Installing…", variant: "secondary" },
		installed: { label: "Installed", variant: "secondary" },
		active: { label: "Active", variant: "default" },
		controlling: { label: "Ready", variant: "default" },
	};

	const { label, variant } = map[status];

	return (
		<Badge
			variant={variant ?? "default"}
			aria-live="polite"
			aria-label={`Service Worker status: ${label}`}
			title={label}
			className="h-5"
		>
			{label}
		</Badge>
	);
}
