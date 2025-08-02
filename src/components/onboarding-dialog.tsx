import {
	DownloadIcon,
	InfoIcon,
	PackageIcon,
	RocketIcon,
	TerminalIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const LS_KEY = "packy:onboarding:v1";

const steps = [
	{
		id: "welcome",
		title: "Welcome to Packy",
		description:
			"Bundle any npm package and all transitive dependencies into a single archive for offline use—right in your browser.",
		icon: RocketIcon,
	},
	{
		id: "select",
		title: "Select a package & version",
		description:
			"Use the Package panel to search npm, pick a version (defaults to latest), and get ready to bundle.",
		icon: PackageIcon,
	},
	{
		id: "bundle",
		title: "Bundle and watch progress",
		description:
			"Click Bundle. Track resolution and packing in the Timeline and Terminal panels.",
		icon: TerminalIcon,
	},
	{
		id: "download",
		title: "Download the archive",
		description:
			"Grab the generated .tgz/.tar from the Downloads panel and move it to your target environment.",
		icon: DownloadIcon,
	},
	{
		id: "tips",
		title: "Tips",
		description:
			"Large graphs can take time. Keep the tab focused. Private packages aren't supported. You can deep-link to start a bundle via ?pkg=name or ?pkg=name@version (version optional; defaults to latest).",
		icon: InfoIcon,
	},
] as const;

export type OnboardingStepId = (typeof steps)[number]["id"];

export function useOnboardingState() {
	const [open, setOpen] = useState(false);
	const [index, setIndex] = useState(0);

	useEffect(() => {
		const seen = localStorage.getItem(LS_KEY);
		if (!seen) setOpen(true);
	}, []);

	const current = steps[index];
	const canPrev = index > 0;
	const canNext = index < steps.length - 1;

	const actions = {
		prev: () => canPrev && setIndex((i) => i - 1),
		next: () => {
			if (canNext) setIndex((i) => i + 1);
			else {
				setOpen(false);
				localStorage.setItem(LS_KEY, "1");
			}
		},
		skip: () => {
			setOpen(false);
			localStorage.setItem(LS_KEY, "1");
		},
		open: () => setOpen(true),
		close: () => setOpen(false),
		goTo: (id: OnboardingStepId) => {
			const idx = steps.findIndex((s) => s.id === id);
			if (idx >= 0) setIndex(idx);
		},
	} as const;

	return { open, setOpen, index, current, canPrev, canNext, actions };
}

export function OnboardingDialog(props: {
	open: boolean;
	onOpenChange(open: boolean): void;
	index: number;
	onNext(): void;
	onPrev(): void;
	onSkip(): void;
}) {
	const { open, onOpenChange, index, onNext, onPrev, onSkip } = props;
	const step = steps[index];
	const StepIcon = step.icon;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<StepIcon className="h-5 w-5 text-primary" aria-hidden />
						{step.title}
					</DialogTitle>
					<DialogDescription>{step.description}</DialogDescription>
				</DialogHeader>

				<div className="mt-2">
					<ol className="grid grid-cols-1 gap-2 text-sm">
						{steps.map((s, i) => (
							<li
								key={s.id}
								className={cn(
									"flex items-center gap-2 rounded border p-2",
									i === index
										? "border-primary/50 bg-primary/5"
										: "border-border",
								)}
							>
								<s.icon className="h-4 w-4 text-muted-foreground" aria-hidden />
								<span className="font-medium">{s.title}</span>
							</li>
						))}
					</ol>
				</div>

				<Separator className="my-2" />

				<DialogFooter className="flex items-center justify-between gap-2">
					<Button variant="ghost" onClick={onSkip} className="mr-auto">
						Skip
					</Button>
					<div className="flex items-center gap-2">
						<Button variant="secondary" onClick={onPrev} disabled={index === 0}>
							Back
						</Button>
						<Button onClick={onNext}>
							{index === steps.length - 1 ? "Finish" : "Next"}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
