"use client";

import { Label } from "@Duty-Roster/ui/components/label";
import { ShiftCountCard } from "./ShiftCountCard";
import { useShiftCountMetrics } from "./useShiftCountMetrics";

export function ShiftCounts() {
	const {
		totalRequired,
		totalAssigned,
		totalCapacity,
		shiftRequirements,
		assignedShiftCounts,
		preferenceCapacity,
	} = useShiftCountMetrics();

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
			{/* Shift Breakdown */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<ShiftCountCard
					shift="total"
					required={totalRequired}
					assigned={totalAssigned}
					capacity={totalCapacity}
				/>
				<ShiftCountCard
					shift="morning"
					required={shiftRequirements.morning}
					assigned={assignedShiftCounts.morning}
					capacity={preferenceCapacity.morning}
				/>
				<ShiftCountCard
					shift="evening"
					required={shiftRequirements.evening}
					assigned={assignedShiftCounts.evening}
					capacity={preferenceCapacity.evening}
				/>
				<ShiftCountCard
					shift="night"
					required={shiftRequirements.night}
					assigned={assignedShiftCounts.night}
					capacity={preferenceCapacity.night}
				/>
			</div>
		</div>
	);
}
