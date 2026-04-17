import { cn } from "@Duty-Roster/ui/lib/utils";
import React, { useCallback, useMemo } from "react";
import { useRosterStore } from "../../store/use-roster-store";
import type { ShiftType } from "../roster-matrix.types";
import { ShiftBadge } from "../shift-dropdown";
import { LAYOUT } from "./constants";

interface NurseRowProps {
	nurse: { id: string; name: string };
	dates: {
		date: Date;
		key: number;
		isToday: boolean;
		shortLabel: string;
		formatted: string;
		label: string;
	}[];
}

export const NurseRow = React.memo(function NurseRow({
	nurse,
	dates,
}: NurseRowProps) {
	const { editable, updateShift, shifts } = useRosterStore();

	const nurseShifts = useMemo(
		() => shifts.filter((sh) => sh.employeeName === nurse.name),
		[shifts, nurse.name],
	);

	const shiftMapByDate = useMemo(
		() => new Map(nurseShifts.map((sh) => [sh.date, sh])),
		[nurseShifts],
	);

	const handleChange = useCallback(
		(date: Date) => (newType: ShiftType) => {
			updateShift(nurse.name, date.toISOString().split("T")[0], newType);
		},
		[nurse.name, updateShift],
	);

	return (
		<div className="flex h-full w-full">
			{dates.map((d) => {
				const dateKey = d.date.toISOString().split("T")[0];
				const shift = shiftMapByDate.get(dateKey);

				return (
					<div
						key={d.key}
						className={cn(
							"flex items-center justify-center border-r border-b px-2 text-center transition-colors",
							d.isToday ? "bg-primary/[0.02]" : "hover:bg-slate-50/50",
						)}
						style={{ flex: `0 0 ${LAYOUT.cellWidth}`, width: LAYOUT.cellWidth }}
					>
						{shift && (
							<ShiftBadge
								type={shift.shiftType}
								nurseName={nurse.name}
								date={d.shortLabel}
								onChange={editable ? handleChange(d.date) : undefined}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
});
