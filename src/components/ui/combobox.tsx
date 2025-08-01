"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type BaseComboboxProps<T> = {
	label: string;
	placeholder: string;
	items: T[];
	getKey: (item: T) => string;
	getLabel: (item: T) => string;
	getDescription?: (item: T) => string | undefined;
	value: T | null;
	onSearch: (q: string) => void;
	onSelect: (item: T) => void;
	loading?: boolean;
	disabled?: boolean;
	widthMatchTrigger?: boolean;
};

export function Combobox<T>({
	label,
	placeholder,
	items,
	getKey,
	getLabel,
	getDescription,
	value,
	onSearch,
	onSelect,
	loading,
	disabled,
	widthMatchTrigger = true,
}: BaseComboboxProps<T>) {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement | null>(null);

	const buttonText = useMemo(() => {
		if (!value) return placeholder;
		return getLabel(value);
	}, [value, placeholder, getLabel]);

	return (
		<div className="space-y-2">
			<div className="text-xs text-neutral-600">{label}</div>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					{/** biome-ignore lint/a11y/useSemanticElements: Custom component, therefore the role="combobox" is necessary */}
					<Button
						ref={triggerRef}
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between disabled:opacity-50"
						disabled={disabled}
					>
						<span className="truncate">{buttonText}</span>
						<ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className={cn(
						"p-0",
						widthMatchTrigger && "w-[var(--radix-popover-trigger-width)]",
					)}
				>
					<Command shouldFilter={false}>
						<CommandInput
							placeholder={placeholder}
							autoFocus
							onValueChange={onSearch}
						/>
						<CommandList>
							{loading ? (
								<div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500">
									<Loader2 className="h-4 w-4 animate-spin" />
									Loading…
								</div>
							) : (
								<>
									<CommandEmpty>No results.</CommandEmpty>
									<CommandGroup>
										{items.map((item) => {
											const k = getKey(item);
											const selected = value ? getKey(value) === k : false;
											return (
												<CommandItem
													key={k}
													value={k}
													onSelect={() => {
														onSelect(item);
														setOpen(false);
														setTimeout(() => triggerRef.current?.focus(), 0);
													}}
													className="flex items-start gap-2"
												>
													<Check
														className={cn(
															"mt-0.5 h-4 w-4",
															selected ? "opacity-100" : "opacity-0",
														)}
													/>
													<div className="min-w-0">
														<div className="truncate font-medium">
															{getLabel(item)}
														</div>
														{getDescription ? (
															<div className="truncate text-xs text-neutral-500">
																{getDescription(item)}
															</div>
														) : null}
													</div>
												</CommandItem>
											);
										})}
									</CommandGroup>
								</>
							)}
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
