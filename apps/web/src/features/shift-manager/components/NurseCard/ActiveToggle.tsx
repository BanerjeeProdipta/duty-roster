"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Ban, Loader2, User } from "lucide-react";

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
			className={cn(isPending && "cursor-not-allowed opacity-70")}
		>
			{isPending ? (
				<Loader2 className="h-3 w-3 animate-spin" />
			) : active ? (
				<User className="h-4 w-4 text-green-600" />
			) : (
				<Ban className="h-4 w-4 text-rose-400" />
			)}
		</Button>
	);
}
