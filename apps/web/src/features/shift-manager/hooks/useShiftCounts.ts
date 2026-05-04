"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMemo } from "react";

interface ShiftCountData {
	required: number;
	preference: number;
	available?: number;
}

interface UseShiftCountsReturn {
	total: ShiftCountData;
	morning: ShiftCountData;
	evening: ShiftCountData;
	night: ShiftCountData;
	activeCount: number;
	inactiveCount: number;
}

interface UseShiftCountsOptions {
	nurseRows: SchedulesResponse["nurseRows"];
	nurses: { active: boolean }[];
	shiftRequirements?: SchedulesResponse["shiftRequirements"];
}

export function useShiftCounts({
	nurseRows,
	nurses,
	shiftRequirements,
}: UseShiftCountsOptions): UseShiftCountsReturn {
	const activeRows = nurseRows.filter((row) => row.nurse.active ?? true);

	const shiftCounts = useMemo(() => {
		// Only count positive values — a 0 means "no preference", not a penalty.
		const pos = (v: number) => (v > 0 ? v : 0);
		return {
			total: {
				required: shiftRequirements?.total ?? 0,
				preference: activeRows.reduce(
					(sum, row) => sum + (row.preferenceWiseShiftMetrics.total ?? 0),
					0,
				),
			},
			morning: {
				required: shiftRequirements?.morning ?? 0,
				preference: activeRows.reduce(
					(sum, row) => sum + (row.preferenceWiseShiftMetrics.morning ?? 0),
					0,
				),
				available: activeRows.reduce(
					(s, r) => s + pos(r.preferenceWiseShiftMetrics.morning ?? 0),
					0,
				),
			},
			evening: {
				required: shiftRequirements?.evening ?? 0,
				preference: activeRows.reduce(
					(sum, row) => sum + (row.preferenceWiseShiftMetrics.evening ?? 0),
					0,
				),
				available: activeRows.reduce(
					(s, r) => s + pos(r.preferenceWiseShiftMetrics.evening ?? 0),
					0,
				),
			},
			night: {
				required: shiftRequirements?.night ?? 0,
				preference: activeRows.reduce(
					(sum, row) => sum + (row.preferenceWiseShiftMetrics.night ?? 0),
					0,
				),
				available: activeRows.reduce(
					(s, r) => s + pos(r.preferenceWiseShiftMetrics.night ?? 0),
					0,
				),
			},
		};
	}, [shiftRequirements, activeRows]);

	const activeCount = nurses.filter((n) => n.active !== false).length;
	const inactiveCount = nurses.length - activeCount;

	return {
		...shiftCounts,
		activeCount,
		inactiveCount,
	};
}
