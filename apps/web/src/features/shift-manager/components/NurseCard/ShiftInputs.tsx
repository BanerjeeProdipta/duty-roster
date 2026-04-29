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
	"bg-[#FDE68A]" | "bg-[#BFDBFE]" | "bg-[#C4B5FD]" | "bg-[#E5E7EB]"
> = {
	morning: "bg-[#FDE68A]",
	evening: "bg-[#BFDBFE]",
	night: "bg-[#C4B5FD]",
	off: "bg-[#E5E7EB]",
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
