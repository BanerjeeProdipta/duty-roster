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
	initialNurseRows?: SchedulesResponse["nurseRows"];
	nurses: { active: boolean }[];
	shiftRequirements?: SchedulesResponse["shiftRequirements"];
	preferenceCapacity?: SchedulesResponse["preferenceCapacity"];
	nurseCounts?: SchedulesResponse["nurseCounts"];
}

export function useShiftCounts({
	nurseRows,
	initialNurseRows,
	nurses,
	shiftRequirements,
	preferenceCapacity,
	nurseCounts,
}: UseShiftCountsOptions): UseShiftCountsReturn {
	const shiftCounts = useMemo(() => {
		// Use server-side aggregate stats (all nurses, no pagination) for preference/available.
		// This keeps the count cards accurate regardless of which page the user is on.
		if (preferenceCapacity) {
			const result = {
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

			// Adjust based on local active toggle modifications in nurseRows
			if (initialNurseRows) {
				for (const row of nurseRows) {
					const originalRow = initialNurseRows.find(
						(r) => r.nurse.id === row.nurse.id,
					);
					if (originalRow) {
						const originalActive = originalRow.nurse.active ?? true;
						const currentActive = row.nurse.active ?? true;

						if (currentActive !== originalActive) {
							const metrics = row.preferenceWiseShiftMetrics;
							const sign = currentActive ? 1 : -1;

							result.total.preference += sign * (metrics.total ?? 0);
							result.morning.preference += sign * (metrics.morning ?? 0);
							if (result.morning.available !== undefined) {
								result.morning.available +=
									sign * Math.max(0, metrics.morning ?? 0);
							}
							result.evening.preference += sign * (metrics.evening ?? 0);
							if (result.evening.available !== undefined) {
								result.evening.available +=
									sign * Math.max(0, metrics.evening ?? 0);
							}
							result.night.preference += sign * (metrics.night ?? 0);
							if (result.night.available !== undefined) {
								result.night.available +=
									sign * Math.max(0, metrics.night ?? 0);
							}
						}
					}
				}
			}
			return result;
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
	}, [shiftRequirements, preferenceCapacity, nurseRows, initialNurseRows]);

	const { activeCount, inactiveCount } = useMemo(() => {
		const baseActive =
			nurseCounts?.active ?? nurses.filter((n) => n.active !== false).length;
		const baseTotal = nurseCounts?.total ?? nurses.length;

		let activeDelta = 0;
		if (initialNurseRows) {
			for (const row of nurseRows) {
				const originalRow = initialNurseRows.find(
					(r) => r.nurse.id === row.nurse.id,
				);
				if (originalRow) {
					const originalActive = originalRow.nurse.active ?? true;
					const currentActive = row.nurse.active ?? true;
					if (currentActive && !originalActive) {
						activeDelta += 1;
					} else if (!currentActive && originalActive) {
						activeDelta -= 1;
					}
				}
			}
		}

		const finalActive = baseActive + activeDelta;
		const finalInactive = baseTotal - finalActive;

		return {
			activeCount: finalActive,
			inactiveCount: finalInactive,
		};
	}, [nurseCounts, nurses, nurseRows, initialNurseRows]);

	return {
		...shiftCounts,
		activeCount,
		inactiveCount,
	};
}
