import { cn } from "@Duty-Roster/ui/lib/utils";
import React from "react";
import type { ShiftDefinition } from "@/hooks/useGetShifts";
import { LAYOUT } from "./Layout";
import type { ShiftType } from "./RosterMatrix.types";
import { ShiftBadge } from "./ShiftDropdown";

interface NurseRowProps {
	nurse: { id: string; name: string; active?: boolean };
	dates: Date[];
	assignments: Record<string, { id: string; shiftType: ShiftType } | null>;
	shifts: ShiftDefinition[];
}

export const NurseRow = React.memo(function NurseRow({
	nurse,
	dates,
	assignments,
	shifts,
}: NurseRowProps) {
	return (
		<div
			className={cn(
				"flex h-full",
				nurse.active === false && "opacity-60 grayscale",
			)}
		>
			{dates.map((date) => {
				const dateKey = date.toISOString().split("T")[0];
				const shift = assignments[dateKey];

				return (
					<div
						key={dateKey}
						className="flex items-center justify-center border-r border-b bg-white"
						style={{
							flex: `0 0 ${LAYOUT.cellWidth}px`,
							width: LAYOUT.cellWidth,
							height: LAYOUT.rowHeight,
						}}
					>
						<ShiftBadge
							type={shift?.shiftType || "off"}
							nurseName={nurse?.name || "Nurse"}
							nurseId={nurse.id}
							date={dateKey}
							assignmentId={shift?.id}
							shifts={shifts}
						/>
					</div>
				);
			})}
		</div>
	);
});
