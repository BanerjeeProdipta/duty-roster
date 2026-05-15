"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Loader2, UserRoundCheck, UserRoundX } from "lucide-react";

interface ActiveToggleProps {
	active: boolean;
	isPending: boolean;
	onToggle: () => void;
}

export function ActiveToggle({
	active,
	isPending,
	onToggle,
}: ActiveToggleProps) {
	return (
		<Button
			onClick={onToggle}
			disabled={isPending}
			variant="secondary"
			className={cn(
				"group text-gray-500 transition duration-300",
				isPending && "cursor-not-allowed opacity-70",
				active
					? "text-emerald-600 hover:bg-emerald-100/40"
					: "text-rose-600 hover:bg-rose-100/40",
			)}
			title={active ? "Deactivate nurse" : "Activate nurse"}
		>
			{isPending ? (
				<Loader2 className="h-3 w-3 animate-spin" />
			) : active ? (
				<UserRoundCheck className="h-4 w-4" />
			) : (
				<UserRoundX className="h-4 w-4" />
			)}
		</Button>
	);
}
