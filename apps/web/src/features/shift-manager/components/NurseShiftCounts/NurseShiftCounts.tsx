"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { ShiftCountCardSimple } from "./ShiftCountCardSimple";

type NurseShiftCountsProps = {
	nurseRows: SchedulesResponse["nurseRows"];
	shiftRequirements?: SchedulesResponse["shiftRequirements"];
};

export function NurseShiftCounts({
	nurseRows,
	shiftRequirements,
}: NurseShiftCountsProps) {
	const activeRows = nurseRows.filter((row) => row.nurse.active ?? true);

	const preferenceTotal = activeRows.reduce(
		(sum, row) => sum + (row.preferenceWiseShiftMetrics.total ?? 0),
		0,
	);
	const preferenceMorning = activeRows.reduce(
		(sum, row) => sum + (row.preferenceWiseShiftMetrics.morning ?? 0),
		0,
	);
	const preferenceEvening = activeRows.reduce(
		(sum, row) => sum + (row.preferenceWiseShiftMetrics.evening ?? 0),
		0,
	);
	const preferenceNight = activeRows.reduce(
		(sum, row) => sum + (row.preferenceWiseShiftMetrics.night ?? 0),
		0,
	);

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<ShiftCountCardSimple
					shift="total"
					required={shiftRequirements?.total ?? 0}
					preference={preferenceTotal}
				/>
				<ShiftCountCardSimple
					shift="morning"
					required={shiftRequirements?.morning ?? 0}
					preference={preferenceMorning}
				/>
				<ShiftCountCardSimple
					shift="evening"
					required={shiftRequirements?.evening ?? 0}
					preference={preferenceEvening}
				/>
				<ShiftCountCardSimple
					shift="night"
					required={shiftRequirements?.night ?? 0}
					preference={preferenceNight}
				/>
			</div>
		</div>
	);
}
