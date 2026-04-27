"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { useEffect, useState } from "react";

const colorMap = {
	green: {
		bg: "bg-green-500",
		border: "!border-green-500",
		focus: "focus:ring-green-500/20",
	},
	red: {
		bg: "bg-red-500",
		border: "!border-red-500",
		focus: "focus:ring-red-500/20",
	},
	blue: {
		bg: "bg-blue-500",
		border: "!border-blue-500",
		focus: "focus:ring-blue-500/20",
	},
	yellow: {
		bg: "bg-yellow-500",
		border: "!border-yellow-500",
		focus: "focus:ring-yellow-500/20",
	},
	// Light variants matching NurseCard usage
	"bg-[#FDE68A]": {
		// light yellow - Day shift
		bg: "bg-[#FDE68A]",
		border: "!border-amber-300",
		focus: "focus:ring-amber-200",
	},
	"bg-[#BFDBFE]": {
		// light blue - Eve shift
		bg: "bg-[#BFDBFE]",
		border: "!border-blue-300",
		focus: "focus:ring-blue-200",
	},
	"bg-[#C4B5FD]": {
		// light violet - Night shift
		bg: "bg-[#C4B5FD]",
		border: "!border-violet-300",
		focus: "focus:ring-violet-200",
	},
	"bg-[#E5E7EB]": {
		// light gray - Off shift
		bg: "bg-[#E5E7EB]",
		border: "!border-gray-300",
		focus: "focus:ring-gray-200",
	},
} as const;

type ColorKey = keyof typeof colorMap;

export function ShiftInput({
	color,
	value,
	onChange,
	max,
	disabled,
}: {
	color: ColorKey;
	value: number;
	onChange: (v: number) => void;
	max: number;
	disabled?: boolean;
}) {
	const [localValue, setLocalValue] = useState(value.toString());

	useEffect(() => {
		setLocalValue(value.toString());
	}, [value]);

	const c = colorMap[color];

	return (
		<div className="flex flex-col items-center">
			<div className="flex items-center gap-1">
				{/* Input */}
				<input
					type="number"
					min={0}
					max={max}
					value={localValue}
					disabled={disabled}
					className={cn(
						"h-9 w-12 rounded-md border-2 bg-slate-50/30 text-center font-extrabold text-sm transition-all",
						"[appearance:textfield] focus:outline-none focus:ring-4 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
						c.border,
						c.focus,
						disabled && "cursor-not-allowed bg-slate-100 text-slate-400",
					)}
					onChange={(e) => {
						const valStr = e.target.value;
						setLocalValue(valStr);

						const valNum = Number.parseInt(valStr, 10);

						if (!Number.isNaN(valNum)) {
							onChange(Math.max(0, valNum));
						} else if (valStr === "") {
							onChange(0);
						}
					}}
				/>
			</div>
		</div>
	);
}
