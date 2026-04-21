import { cn } from "@Duty-Roster/ui/lib/utils";
import type * as React from "react";

const badgeVariants = {
	default: "border-transparent bg-slate-100 text-slate-800",
	secondary: "border-transparent bg-slate-50 text-slate-600",
	success: "border-green-200 bg-green-50 text-green-800",
	warning: "border-amber-200 bg-amber-50 text-amber-800",
	error: "border-red-200 bg-red-100 text-red-800",
	outline: "border-slate-200 text-slate-700",
	// Shift-specific variants
	morning: "border-amber-200 bg-amber-50 text-amber-900",
	evening: "border-blue-200 bg-blue-50 text-blue-900",
	night: "border-violet-200 bg-violet-50 text-violet-900",
	inactive: "border-rose-200 bg-rose-100 text-rose-600",
};

type BadgeVariant = keyof typeof badgeVariants;

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
	return (
		<span
			data-slot="badge"
			className={cn(
				"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium text-xs",
				badgeVariants[variant],
				className,
			)}
			{...props}
		/>
	);
}

export type { BadgeVariant };
export { Badge, badgeVariants };
