import { cn } from "@Duty-Roster/ui/lib/utils";
import { Input as InputPrimitive } from "@base-ui/react/input";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"h-8 min-h-10 w-full min-w-0 border border-slate-300 bg-white px-2.5 py-2 text-slate-900 text-xs outline-none transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-xs placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:text-slate-500 dark:disabled:bg-slate-800",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
