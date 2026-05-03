"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMemo } from "react";

export type ShiftDeficit = {
	shift: string;
	required: number;
	available: number;
	gap: number;
};

export type SolverValidation = {
	totalCapacity: number;
	totalRequired: number;
	baseMaxShifts: number;
	weeksInMonth: number;
	activeNurseCount: number;
	nurseOverlimits: Array<{
		name: string;
		assignableTotal: number;
		nurseMax: number;
		nightShifts: number;
	}>;
	shiftCapacityIssues: ShiftDeficit[];
	shiftBuffers: Record<string, number>;
	allExact: boolean;
	hasIssues: boolean;
} | null;

interface UseSolverValidationOptions {
	nurseRows: SchedulesResponse["nurseRows"];
	totalDays: number;
	shiftRequirements: SchedulesResponse["shiftRequirements"];
}

export function useSolverValidation({
	nurseRows,
	totalDays,
	shiftRequirements,
}: UseSolverValidationOptions): {
	solverValidation: SolverValidation;
	shiftDeficits: ShiftDeficit[];
	showExactMatchWarning: boolean;
} {
	const activeRows = nurseRows.filter((r) => r.nurse.active);

	const solverValidation = useMemo(() => {
		if (activeRows.length === 0 || !shiftRequirements) return null;

		const req = shiftRequirements;
		const weeksInMonth = Math.floor(totalDays / 7);
		const baseMaxShifts = totalDays - weeksInMonth;
		const totalRequired = req.morning + req.evening + req.night;
		const totalCapacity = activeRows.length * baseMaxShifts;

		const sv = (v: number) => (v > 0 ? v : -1);
		const nurseOverlimits = activeRows
			.map((row) => {
				const m = row.preferenceWiseShiftMetrics;
				const assignableTotal = Math.max(
					0,
					(m.morning > 0 ? m.morning : -1) +
						(m.evening > 0 ? m.evening : -1) +
						(m.night > 0 ? m.night : -1),
				);
				return {
					name: row.nurse.name,
					assignableTotal,
					nurseMax: baseMaxShifts,
					nightShifts: m.night ?? 0,
					hasOverlimit: assignableTotal > baseMaxShifts,
				};
			})
			.filter((n) => n.hasOverlimit);

		const shiftCapacityIssues: ShiftDeficit[] = [];
		const shiftBuffers: Record<string, number> = {};
		for (const shift of ["morning", "evening", "night"] as const) {
			const available = activeRows.reduce(
				(s, r) => s + sv(r.preferenceWiseShiftMetrics[shift] ?? 0),
				0,
			);
			const buffer = available - req[shift];
			shiftBuffers[shift] = buffer;
			if (available < req[shift]) {
				shiftCapacityIssues.push({
					shift,
					required: req[shift],
					available,
					gap: buffer,
				});
			}
		}

		const allExact =
			(shiftBuffers.morning ?? 0) === 0 &&
			(shiftBuffers.evening ?? 0) === 0 &&
			(shiftBuffers.night ?? 0) === 0;

		return {
			totalCapacity,
			totalRequired,
			baseMaxShifts,
			weeksInMonth,
			activeNurseCount: activeRows.length,
			nurseOverlimits,
			shiftCapacityIssues,
			shiftBuffers,
			allExact,
			hasIssues:
				totalCapacity < totalRequired ||
				nurseOverlimits.length > 0 ||
				shiftCapacityIssues.length > 0,
		};
	}, [shiftRequirements, nurseRows, totalDays]);

	const shiftDeficits = useMemo<ShiftDeficit[]>(() => {
		if (!shiftRequirements) return [];

		const sv = (v: number) => (v > 0 ? v : -1);

		const available = {
			morning: activeRows.reduce(
				(s, r) => s + sv(r.preferenceWiseShiftMetrics.morning ?? 0),
				0,
			),
			evening: activeRows.reduce(
				(s, r) => s + sv(r.preferenceWiseShiftMetrics.evening ?? 0),
				0,
			),
			night: activeRows.reduce(
				(s, r) => s + sv(r.preferenceWiseShiftMetrics.night ?? 0),
				0,
			),
		};

		const deficits: ShiftDeficit[] = [];
		for (const shift of ["morning", "evening", "night"] as const) {
			const gap = Math.max(0, available[shift]) - shiftRequirements[shift];
			if (gap < 0) {
				deficits.push({
					shift,
					required: shiftRequirements[shift],
					available: available[shift],
					gap,
				});
			}
		}
		return deficits;
	}, [shiftRequirements, nurseRows]);

	const showExactMatchWarning = useMemo(() => {
		if (!shiftRequirements) return false;
		const reqTotal = shiftRequirements.total ?? 0;
		if (reqTotal === 0) return false;
		if (activeRows.length === 0) return false;
		const offDaysByNurse = activeRows.map((row) => {
			const metrics = row.preferenceWiseShiftMetrics;
			const worked =
				(metrics.morning ?? 0) + (metrics.evening ?? 0) + (metrics.night ?? 0);
			return totalDays - worked;
		});
		const uniqueOffCounts = new Set(offDaysByNurse);
		return uniqueOffCounts.size > 1;
	}, [shiftRequirements, nurseRows, totalDays]);

	return {
		solverValidation,
		shiftDeficits,
		showExactMatchWarning,
	};
}
