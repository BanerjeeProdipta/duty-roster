"use client";

import { Label } from "@Duty-Roster/ui/components/label";
import { useShiftCountMetrics } from "@/components/analytics/useShiftCountMetrics";
import { ShiftCountCard } from "./ShiftCountCard";

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
			{/* Summary Row */}
			<div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
				<div className="flex flex-col">
					<Label>Required</Label>
					<span className="font-bold text-slate-800 text-xl">
						{totalRequired}
					</span>
				</div>

				<div className="flex flex-col items-center">
					<Label>Assigned</Label>
					<span
						className={`font-bold text-xl ${
							totalAssigned >= totalRequired ? "text-green-600" : "text-red-500"
						}`}
					>
						{totalAssigned}
					</span>
				</div>

				<div className="flex flex-col">
					<Label>Needed</Label>
					<span className="font-bold text-slate-800 text-xl">
						{Math.max(0, totalRequired - totalAssigned)}
					</span>
				</div>

				<div className="flex flex-col items-end">
					<Label>Capacity</Label>
					<span className="font-bold text-slate-600 text-xl">
						{Math.round(totalCapacity)}
					</span>
				</div>
			</div>

			{/* Shift Breakdown */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
