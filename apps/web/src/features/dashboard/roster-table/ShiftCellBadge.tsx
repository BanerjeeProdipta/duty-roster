"use client";

import { cn } from "@Duty-Roster/ui/lib/utils";
import { SHIFT_ICONS, SHIFT_STYLES } from "./RosterMatrix.constants";
import type { ShiftType } from "./RosterMatrix.types";

interface ShiftCellBadgeProps {
	type: ShiftType;
	nurseName: string;
	nurseId: string;
	date: string;
	isSelected?: boolean;
}

export function ShiftCellBadge({
	type,
	nurseName,
	nurseId,
	date,
	isSelected = false,
}: ShiftCellBadgeProps) {
	const formatDateDMY = (dateStr: string) => {
		const date = new Date(`${dateStr}T00:00:00`);
		const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		const dayName = days[date.getDay()];
		const day = date.getDate().toString().padStart(2, "0");
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const year = date.getFullYear();
		return `${dayName}, ${day}-${month}-${year}`;
	};

	return (
		<div
			data-shift-badge
			data-testid={`shift-cell-${nurseId}-${date}`}
			className={cn(
				"flex h-12 w-12 items-center justify-center rounded-lg font-bold text-lg",
				"cursor-pointer transition-all duration-200",
				!type && "border-2 border-gray-300 border-dashed",
				SHIFT_STYLES[type],
				isSelected && "ring-2 ring-blue-400/70 ring-inset",
			)}
			title={`${nurseName} - ${formatDateDMY(date)}`}
		>
			{SHIFT_ICONS[type]}
		</div>
	);
}
