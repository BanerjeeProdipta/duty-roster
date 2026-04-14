import { cn } from "@Duty-Roster/ui/lib/utils";
import type * as React from "react";

type LabelProps = React.ComponentProps<"label"> & {
	htmlFor: string;
};

function Label({ className, htmlFor, children, ...props }: LabelProps) {
	return (
		<label
			data-slot="label"
			htmlFor={htmlFor}
			className={cn(
				"font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
				className,
			)}
			{...props}
		>
			{children}
		</label>
	);
}

export { Label };
