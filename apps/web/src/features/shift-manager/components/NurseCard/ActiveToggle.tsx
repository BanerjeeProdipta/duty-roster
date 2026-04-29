"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { Ban, Loader2, User } from "lucide-react";

interface ActiveToggleProps {
	name: string;
	active: boolean;
	isPending: boolean;
	onToggle: () => void;
}

export function ActiveToggle({
	name,
	active,
	isPending,
	onToggle,
}: ActiveToggleProps) {
	return (
		<button
			type="button"
			onClick={onToggle}
			disabled={isPending}
			className={cn(
				"inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium text-sm hover:bg-slate-100",
				isPending && "cursor-not-allowed opacity-70",
			)}
		>
			{isPending ? (
				<Loader2 className="h-3 w-3 animate-spin" />
			) : active ? (
				<User className="h-4 w-4" />
			) : (
				<Ban className="h-4 w-4" />
			)}
			<span className={cn(!active && "text-slate-400")}>{name}</span>
		</button>
	);
}
