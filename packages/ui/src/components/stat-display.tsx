import { cn } from "@Duty-Roster/ui/lib/utils";
import type * as React from "react";

interface StatDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string;
	value: string | number;
	variant?: "default" | "success" | "warning" | "error";
}

function StatDisplay({
	className,
	label,
	value,
	variant = "default",
	...props
}: StatDisplayProps) {
	const valueColorClass = {
		default: "text-slate-800",
		success: "text-green-700",
		warning: "text-amber-700",
		error: "text-red-700",
	}[variant];

	return (
		<div className={cn("flex flex-col items-center", className)} {...props}>
			<span className="font-medium text-slate-500 text-xs uppercase tracking-wide">
				{label}
			</span>
			<span className={cn("font-bold text-lg tabular-nums", valueColorClass)}>
				{value}
			</span>
		</div>
	);
}

export { StatDisplay };
