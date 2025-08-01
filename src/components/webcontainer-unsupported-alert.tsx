import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function WebcontainerUnsupportedAlert({ wc }: { wc: unknown | null }) {
	if (wc !== null) return null;

	return (
		<Alert variant="destructive" role="alert" className="col-span-full">
			<TriangleAlert className="h-4 w-4" aria-hidden="true" />
			<AlertTitle>WebContainers not supported</AlertTitle>
			<AlertDescription>
				Your browser doesn’t support WebContainers. Please switch to a modern,
				up-to-date browser (e.g., the latest Chrome, Edge, or Firefox) and try
				again.
			</AlertDescription>
		</Alert>
	);
}
