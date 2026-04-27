import { cn } from "@Duty-Roster/ui/lib/utils";
import type * as React from "react";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
	/**
	 * Label style variant
	 * - default: uppercase with tracking
	 * - inline: mixed case, no transform
	 */
	variant?: "default" | "inline";
}

function Label({ className, variant = "default", ...props }: LabelProps) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: association is the caller's responsibility
		<label
			data-slot="label"
			className={cn(
				"font-medium text-xs",
				variant === "default" && "text-slate-500 uppercase tracking-wide",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
