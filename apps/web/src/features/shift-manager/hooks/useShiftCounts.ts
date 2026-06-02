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
	preferenceCapacity?: SchedulesResponse["preferenceCapacity"];
	nurseCounts?: SchedulesResponse["nurseCounts"];
}

export function useShiftCounts({
	nurseRows,
	nurses,
	shiftRequirements,
	preferenceCapacity,
	nurseCounts,
}: UseShiftCountsOptions): UseShiftCountsReturn {
	const shiftCounts = useMemo(() => {
		// Use server-side aggregate stats (all nurses, no pagination) for preference/available.
		// This keeps the count cards accurate regardless of which page the user is on.
		if (preferenceCapacity) {
			return {
				total: {
					required: shiftRequirements?.total ?? 0,
					preference: preferenceCapacity.total,
				},
				morning: {
					required: shiftRequirements?.morning ?? 0,
					preference: preferenceCapacity.morning,
					available: preferenceCapacity.morning,
				},
				evening: {
					required: shiftRequirements?.evening ?? 0,
					preference: preferenceCapacity.evening,
					available: preferenceCapacity.evening,
				},
				night: {
					required: shiftRequirements?.night ?? 0,
					preference: preferenceCapacity.night,
					available: preferenceCapacity.night,
				},
			};
		}

		// Fallback: compute from nurseRows (e.g. if preferenceCapacity isn't available yet)
		const activeRows = nurseRows.filter((row) => row.nurse.active ?? true);
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
	}, [shiftRequirements, preferenceCapacity, nurseRows]);

	const activeCount =
		nurseCounts?.active ?? nurses.filter((n) => n.active !== false).length;
	const inactiveCount =
		nurseCounts != null
			? nurseCounts.total - nurseCounts.active
			: nurses.length - activeCount;

	return {
		...shiftCounts,
		activeCount,
		inactiveCount,
	};
}
