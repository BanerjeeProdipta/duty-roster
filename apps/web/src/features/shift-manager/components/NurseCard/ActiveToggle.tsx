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
		<div className="relative inline-flex items-center justify-center">
			<Switch
				checked={active}
				disabled={isPending}
				onCheckedChange={onToggle}
				className={cn(isPending && "opacity-40")}
				style={
					{
						"--switch-width": "2.5rem",
						"--switch-height": "1.375rem",
						"--switch-thumb-size": "1.125rem",
					} as CSSProperties
				}
			/>
			{isPending && (
				<Loader2 className="absolute h-3.5 w-3.5 animate-spin text-accent-primary" />
			)}
		</div>
	);
}
