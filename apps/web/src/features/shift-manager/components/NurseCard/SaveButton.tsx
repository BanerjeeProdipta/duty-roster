"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { Loader2, Save } from "lucide-react";

interface SaveButtonProps {
	isPending: boolean;
	disabled: boolean;
	onClick: () => void;
}

export function SaveButton({ isPending, disabled, onClick }: SaveButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || isPending}
			className={cn(
				"inline-flex items-center gap-1 rounded-md bg-lime-100 px-2 py-1 font-medium text-lime-700 text-xs hover:bg-lime-200",
				"disabled:cursor-not-allowed disabled:opacity-50",
				isPending && "animate-pulse cursor-wait",
			)}
		>
			{isPending ? (
				<Loader2 className="h-5 w-5 animate-spin" />
			) : (
				<Save className="h-6 w-6" />
			)}
		</button>
	);
}
