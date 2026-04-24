import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMemo } from "react";

export function useShiftCountMetrics(schedules?: SchedulesResponse) {
	const nurseRows = schedules?.nurseRows ?? [];
	const dailyShiftCounts = schedules?.dailyShiftCounts ?? {};

	return useMemo(() => {
		const shiftRequirements = {
			morning: 0,
			evening: 0,
			night: 0,
		};

		const assignedShiftCounts = {
			morning: 0,
			evening: 0,
			night: 0,
		};

		const preferenceCapacity = {
			morning: 0,
			evening: 0,
			night: 0,
		};

		for (const [dateStr, counts] of Object.entries(dailyShiftCounts)) {
			assignedShiftCounts.morning += counts.morning ?? 0;
			assignedShiftCounts.evening += counts.evening ?? 0;
			assignedShiftCounts.night += counts.night ?? 0;

			// Friday has lower morning requirement; other days use weekday targets.
			const date = new Date(`${dateStr}T00:00:00`);
			if (date.getDay() === 5) {
				shiftRequirements.morning += 3;
			} else {
				shiftRequirements.morning += 20;
			}
			shiftRequirements.evening += 3;
			shiftRequirements.night += 2;
		}

		nurseRows.forEach((row) => {
			const preference = row.preferenceWiseShiftMetrics;
			preferenceCapacity.morning += preference.morning ?? 0;
			preferenceCapacity.evening += preference.evening ?? 0;
			preferenceCapacity.night += preference.night ?? 0;
		});

		const totalAssigned =
			assignedShiftCounts.morning +
			assignedShiftCounts.evening +
			assignedShiftCounts.night;

		const totalRequired =
			shiftRequirements.morning +
			shiftRequirements.evening +
			shiftRequirements.night;

		const totalCapacity =
			preferenceCapacity.morning +
			preferenceCapacity.evening +
			preferenceCapacity.night;

		return {
			totalRequired,
			totalAssigned,
			totalCapacity,
			shiftRequirements,
			assignedShiftCounts,
			preferenceCapacity,
		};
	}, [nurseRows, dailyShiftCounts]);
}
