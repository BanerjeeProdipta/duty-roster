import React from "react";
import { LAYOUT } from "./constants";
import type { ShiftType } from "./roster-matrix.types";
import { ShiftBadge } from "./shift-dropdown";

interface NurseRowProps {
	nurse: { id: string; name: string };
	dates: Date[];
	assignments: Record<string, { id: string; shiftType: ShiftType } | null>;
	editable?: boolean;
}

export const NurseRow = React.memo(function NurseRow({
	nurse,
	dates,
	assignments,
	editable = false,
}: NurseRowProps) {
	return (
		<div className="flex h-full">
			{dates.map((date) => {
				const dateKey = date.toISOString().split("T")[0];
				const shift = assignments[dateKey];

				return (
					<div
						key={dateKey}
						className="flex items-center justify-center border-r border-b bg-white"
						style={{
							flex: `0 0 ${LAYOUT.cellWidth}`,
							width: LAYOUT.cellWidth,
							height: LAYOUT.rowHeight,
						}}
					>
						<ShiftBadge
							type={shift?.shiftType || "off"}
							nurseName={nurse?.name || "Nurse"}
							date={dateKey}
							onChange={
								editable
									? (newType) => {
											console.log("Shift update:", nurse.id, dateKey, newType);
										}
									: undefined
							}
						/>
					</div>
				);
			})}
		</div>
	);
});
