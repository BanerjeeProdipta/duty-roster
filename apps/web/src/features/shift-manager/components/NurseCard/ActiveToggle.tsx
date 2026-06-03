"use client";

import { Switch } from "@Duty-Roster/ui/components/switch";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { Loader2 } from "lucide-react";
import type { CSSProperties } from "react";

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
		<Switch
			checked={active}
			disabled={isPending}
			onCheckedChange={onToggle}
			className={cn("group", isPending && "opacity-70")}
			style={
				{
					"--switch-width": "1.75rem",
					"--switch-height": "1rem",
					"--switch-thumb-size": "0.75rem",
				} as CSSProperties
			}
		>
			{isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
		</Switch>
	);
}
