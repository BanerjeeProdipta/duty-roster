import { cn } from "@Duty-Roster/ui/lib/utils";
import { useEffect, useState } from "react";

export function ShiftInput({
	label,
	color,
	value,
	onChange,
	max,
}: {
	label: string;
	color: string;
	value: number;
	onChange: (v: number) => void;
	max: number;
}) {
	const [localValue, setLocalValue] = useState(value.toString());

	useEffect(() => {
		setLocalValue(value.toString());
	}, [value]);

	return (
		<div className="flex flex-col items-center">
			<div className="flex items-center gap-1">
				<div className={cn("h-2 w-2 rounded-full", color)} title={label} />
				<input
					type="number"
					min={0}
					max={max}
					value={localValue}
					className="h-8 w-10 rounded border border-slate-200 bg-slate-50/50 text-center font-bold text-sm [appearance:textfield] focus:border-primary focus:ring-1 focus:ring-primary/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
			<span className="mt-1 font-bold text-[8px] text-slate-400 uppercase">
				{label}
			</span>
		</div>
	);
}
