"use client";

import type { NurseState } from "./types";

export interface NurseSummary {
	totalCount: number;
	activeCount: number;
	inactiveCount: number;
	totalMorning: number;
	totalEvening: number;
	totalNight: number;
	totalOff: number;
}

/**
 * Calculate summary from normalized nurse state (rounded values)
 * Note: This is a regular function, not a hook - intentionally named without "use" prefix
 * to avoid React hook linting rules, since it doesn't use any React hooks internally.
 */
export function getNurseSummary(
	nurses: NurseState[],
	_totalDays: number,
): NurseSummary {
	const activeCount = nurses.filter((n) => n.active).length;
	const inactiveCount = nurses.length - activeCount;

	// Only include active nurses
	const totalMorning = nurses.reduce(
		(acc, n) => acc + (n.active ? n.morning : 0),
		0,
	);
	const totalEvening = nurses.reduce(
		(acc, n) => acc + (n.active ? n.evening : 0),
		0,
	);
	const totalNight = nurses.reduce(
		(acc, n) => acc + (n.active ? n.night : 0),
		0,
	);
	const totalOff = nurses.reduce((acc, n) => acc + (n.active ? n.off : 0), 0);

	return {
		totalCount: nurses.length,
		activeCount,
		inactiveCount,
		totalMorning,
		totalEvening,
		totalNight,
		totalOff,
	};
}
