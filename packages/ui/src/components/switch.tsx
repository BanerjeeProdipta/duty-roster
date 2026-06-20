"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as React from "react";
import { cn } from "../lib/utils";

const Switch = React.forwardRef<
	React.ElementRef<typeof SwitchPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
		checked?: boolean;
		disabled?: boolean;
	}
>((props, ref) => {
	const { checked, disabled, className, ...switchProps } = props;

	return (
		<SwitchPrimitive.Root
			ref={ref}
			checked={checked ?? false}
			disabled={disabled ?? false}
			{...switchProps}
			className={cn(
				"inline-flex h-[var(--switch-height)] w-[var(--switch-width)] shrink-0 items-center overflow-hidden rounded-full border border-transparent bg-gray-400 transition-colors duration-200",
				"data-[state=checked]:bg-accent-primary/20",
				className,
			)}
		>
			<SwitchPrimitive.Thumb
				className={cn(
					"block h-[var(--switch-thumb-size)] w-[var(--switch-thumb-size)] shrink-0 rounded-full bg-white transition-transform",
					"data-[state=unchecked]:translate-x-0.5",
					"data-[state=checked]:translate-x-full",
					"data-[state=checked]:bg-accent-primary",
				)}
			/>
		</SwitchPrimitive.Root>
	);
});
Switch.displayName = SwitchPrimitive.Root.displayName;

export { Switch };
