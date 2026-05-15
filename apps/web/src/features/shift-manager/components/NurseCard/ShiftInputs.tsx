"use client";

import { ShiftInput } from "@/features/shift-manager/components/ShiftInput";
import type { ShiftField } from "@/features/shift-manager/types";

interface ShiftInputsProps {
	values: Record<ShiftField, number>;
	onChange: (field: ShiftField, value: number) => void;
	max: number;
}

const shiftColor: Record<
	ShiftField,
	"bg-shift-morning" | "bg-shift-evening" | "bg-shift-night" | "bg-shift-off"
> = {
	morning: "bg-shift-morning",
	evening: "bg-shift-evening",
	night: "bg-shift-night",
	off: "bg-shift-off",
};

const SHIFT_FIELDS: ShiftField[] = ["morning", "evening", "night", "off"];

export function ShiftInputs({ values, onChange, max }: ShiftInputsProps) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			{SHIFT_FIELDS.map((field) => (
				<ShiftInput
					key={field}
					color={shiftColor[field]}
					value={values[field]}
					onChange={(v) => onChange(field, v)}
					max={max}
				/>
			))}
		</div>
	);
}
