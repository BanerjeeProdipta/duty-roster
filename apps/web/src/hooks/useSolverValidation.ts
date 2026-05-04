"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMemo } from "react";

export interface FlexibilityMetrics {
	[shiftType: string]: {
		required: number;
		needed: number;
		assignable: number;
		preference: number;
		ratio: number;
		buffer: number;
		isInfeasible: boolean;
		isTight: boolean;
	};
}

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

interface UseFlexibilityMetricsProps {
	shiftRequirements?: SchedulesResponse["shiftRequirements"];
	shiftCounts?: {
		[shift: string]: {
			required: number;
			preference: number;
			available?: number; // optional — falls back to preference
		};
	};
	shiftAllocated?: {
		[shift: string]: number;
	};
	totalDays: number;
	nurses?: Array<{ name: string; active: boolean }>;
	nurseRows?: SchedulesResponse["nurseRows"];
}

export function useFlexibilityMetrics({
	shiftRequirements,
	shiftCounts,
	shiftAllocated,
}: UseFlexibilityMetricsProps): FlexibilityMetrics {
	const shiftTypes = ["morning", "evening", "night"] as const;
	const metrics: FlexibilityMetrics = {};

	for (const shift of shiftTypes) {
		const required = shiftRequirements?.[shift] ?? 0;
		const needed = shiftAllocated?.[shift] ?? 0;
		const preference = shiftCounts?.[shift]?.preference ?? 0;
		// Fall back to preference when available is not explicitly provided
		const available = shiftCounts?.[shift]?.available ?? preference;
		const buffer = available - required;
		const ratio =
			available > 0 ? required / available : Number.POSITIVE_INFINITY;
		const isInfeasible = available < required;
		const isTight = !isInfeasible && buffer > 0 && buffer < required * 0.15;

		metrics[shift] = {
			required,
			needed,
			assignable: available,
			preference,
			ratio,
			buffer,
			isInfeasible,
			isTight,
		};
	}

	for (const shift of shiftTypes) {
		if (metrics[shift].preference > metrics[shift].assignable) {
		}
	}

	return metrics;
}

export function analyzeFeasibility(metrics: FlexibilityMetrics) {
	const infeasibleShifts = Object.entries(metrics)
		.filter(([_, m]) => m.isInfeasible)
		.map(([shift, m]) => ({
			shift,
			required: m.required,
			assignable: m.assignable,
			deficit: m.required - m.assignable,
		}));

	const tightShifts = Object.entries(metrics)
		.filter(([_, m]) => m.isTight)
		.map(([shift, m]) => ({
			shift,
			buffer: m.buffer,
			ratio: m.ratio,
		}));

	const cappedShifts = Object.entries(metrics)
		.filter(([_, m]) => m.preference > m.assignable && !m.isInfeasible)
		.map(([shift, m]) => ({
			shift,
			preference: m.preference,
			assignable: m.assignable,
			excess: m.preference - m.assignable,
		}));

	return {
		isFeasible: infeasibleShifts.length === 0,
		infeasibleShifts,
		tightShifts,
		cappedShifts,
		hasCriticalIssues: infeasibleShifts.length > 0,
		hasWarnings: tightShifts.length > 0 || cappedShifts.length > 0,
	};
}

export function getRecommendation(
	shift: string,
	metrics: FlexibilityMetrics[string],
): string {
	if (metrics.isInfeasible) {
		const deficit = metrics.required - metrics.assignable;
		return `Reduce ${shift} coverage by ${deficit}, or increase capacity`;
	}

	if (metrics.preference > metrics.assignable) {
		const excess = metrics.preference - metrics.assignable;
		return `Nurses want ${excess} more ${shift} shifts than available`;
	}

	if (metrics.isTight) {
		return `${shift} has only ${metrics.buffer} shift buffer - tight constraint`;
	}

	return `${shift} is feasible`;
}

export function formatMetrics(metrics: FlexibilityMetrics[string]) {
	return {
		required: metrics.required,
		needed: metrics.needed,
		available: metrics.assignable,
		preference: metrics.preference,
		buffer: metrics.buffer,
		ratio: metrics.ratio.toFixed(2),
		percentRequired: ((metrics.ratio * 100) | 0) + "%",
		bufferPercent: Math.round((metrics.buffer / metrics.required) * 100) + "%",
		status: metrics.isInfeasible
			? "INFEASIBLE"
			: metrics.isTight
				? "TIGHT"
				: "OK",
	};
}

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

		// Only count positive values — a 0 means "no preference", not a penalty.
		const pos = (v: number) => (v > 0 ? v : 0);
		const nurseOverlimits = activeRows
			.map((row) => {
				const m = row.preferenceWiseShiftMetrics;
				const assignableTotal =
					pos(m.morning ?? 0) + pos(m.evening ?? 0) + pos(m.night ?? 0);
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
				(s, r) => s + pos(r.preferenceWiseShiftMetrics[shift] ?? 0),
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

		// Only count positive values — a 0 means "no preference", not a penalty.
		const pos = (v: number) => (v > 0 ? v : 0);

		const available = {
			morning: activeRows.reduce(
				(s, r) => s + pos(r.preferenceWiseShiftMetrics.morning ?? 0),
				0,
			),
			evening: activeRows.reduce(
				(s, r) => s + pos(r.preferenceWiseShiftMetrics.evening ?? 0),
				0,
			),
			night: activeRows.reduce(
				(s, r) => s + pos(r.preferenceWiseShiftMetrics.night ?? 0),
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
