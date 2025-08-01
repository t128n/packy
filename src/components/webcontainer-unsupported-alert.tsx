import { Hourglass, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function WebcontainerWaitingAlert() {
	return (
		<Alert variant="default" role="alert" className="col-span-full">
			<Hourglass className="h-4 w-4" aria-hidden="true" />
			<AlertTitle>WebContainer not ready yet</AlertTitle>
			<AlertDescription>
				WebContainer is not ready yet, please wait a little bit...
			</AlertDescription>
		</Alert>
	);
}

function WebcontainerUnsupportedSubAlert() {
	return (
		<Alert variant="destructive" role="alert" className="col-span-full">
			<TriangleAlert className="h-4 w-4" aria-hidden="true" />
			<AlertTitle>WebContainers not supported</AlertTitle>
			<AlertDescription>
				Your browser doesn't support WebContainers. Please switch to a modern,
				up-to-date browser (e.g., the latest Chrome, Edge, or Firefox) and try
				again.
			</AlertDescription>
		</Alert>
	);
}

type Props = {
	wc: unknown | null;
};

export function WebcontainerUnsupportedAlert({ wc }: Props) {
	const [showSoft, setShowSoft] = useState(false);
	const [showHard, setShowHard] = useState(false);

	const softTimerRef = useRef<number | null>(null);
	const hardTimerRef = useRef<number | null>(null);

	useEffect(() => {
		// Clear timers helper
		const clearTimers = () => {
			if (softTimerRef.current) {
				clearTimeout(softTimerRef.current);
				softTimerRef.current = null;
			}
			if (hardTimerRef.current) {
				clearTimeout(hardTimerRef.current);
				hardTimerRef.current = null;
			}
		};

		if (wc === null) {
			// Reset state each time we go back to null
			setShowSoft(false);
			setShowHard(false);

			// Start soft alert after 3s
			softTimerRef.current = window.setTimeout(() => {
				setShowSoft(true);
			}, 3000);

			// Escalate to hard error after 30s
			hardTimerRef.current = window.setTimeout(() => {
				setShowHard(true);
			}, 30000);

			return clearTimers;
		}

		// wc resolved: hide and clear timers
		clearTimers();
		setShowSoft(false);
		setShowHard(false);

		return clearTimers;
	}, [wc]);

	if (wc !== null) return null;
	if (showHard) return <WebcontainerUnsupportedSubAlert />;
	if (showSoft) return <WebcontainerWaitingAlert />;
	return null;
}
