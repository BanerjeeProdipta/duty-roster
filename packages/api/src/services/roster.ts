import type { Assignment } from "@Duty-Roster/db/types/shift";
import * as rosterDb from "../db/roster";
import type { SchedulesResponse } from "../schemas/roster";
import {
	getDaysCountFromStartAndEndDate,
	normalizeShiftId,
} from "../utils/roster";

type GenerateRosterParams = {
	year: number;
	month: number;
};

// ───────────── CONFIG ─────────────

export const ROSTER_CONFIG = {
	COVERAGE: {
		WEEKDAY: { morning: 20, evening: 3, night: 2 },
		FRIDAY: { morning: 3, evening: 3, night: 2 },
	},
	CONSTRAINTS: {
		MAX_NIGHTS_PER_NURSE: 3,
		MIN_DAYS_OFF_PER_WEEK: 1,
	},
} as const;

// ───────────── PREFERENCES (merged logic) ─────────────

/** Get all preferences + capacity in one query */
export async function getNursePreferencesWithCapacity() {
	const rows = await rosterDb.findAllPreferredShiftsByNurse();

	const prefsMap = new Map<
		string,
		{
			nurseId: string;
			name: string;
			morning: number;
			evening: number;
			night: number;
			active: boolean;
		}
	>();
	const capacity = { morning: 0, evening: 0, night: 0 };

	for (const row of rows) {
		const nurseId = row.nurse.id;
		if (!prefsMap.has(nurseId)) {
			prefsMap.set(nurseId, {
				nurseId,
				name: row.nurse.name,
				morning: 0,
				evening: 0,
				night: 0,
				active: row.active ?? true,
			});
		}
		const pref = prefsMap.get(nurseId)!;
		const shiftKey = normalizeShiftId(row.shiftId) as
			| "morning"
			| "evening"
			| "night";
		if (shiftKey) {
			pref[shiftKey] = row.weight;
			// Add to capacity if active
			if (pref.active) {
				capacity[shiftKey] += row.weight;
			}
		}
	}

	return { preferences: Array.from(prefsMap.values()), capacity };
}

export async function updateNurseShiftPreferenceWeights(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[],
	daysInMonth: number,
) {
	// Validate: ensure morning + evening + night <= 100%
	const byNurse = new Map<string, typeof preferences>();
	for (const p of preferences) {
		const existing = byNurse.get(p.nurseId) ?? [];
		existing.push(p);
		byNurse.set(p.nurseId, existing);
	}

	const validated: typeof preferences = [];
	for (const [, prefs] of byNurse) {
		const totalWeight = prefs.reduce((sum, p) => sum + p.weight, 0);
		if (totalWeight > 100) {
			// Normalize weights to sum to 100
			const scale = 100 / totalWeight;
			for (const p of prefs) {
				validated.push({ ...p, weight: Math.round(p.weight * scale) });
			}
		} else {
			validated.push(...prefs);
		}
	}

	await rosterDb.upsertNurseShiftPreferences(validated, daysInMonth);
}

// ───────────── SCHEDULES ─────────────

export async function getNurses() {
	return rosterDb.findAllNurses();
}

export async function getShifts() {
	return rosterDb.findAllShifts();
}

export async function getSchedulesByDateRange(
	startDate: Date,
	endDate: Date,
): Promise<SchedulesResponse> {
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	const totalDays = getDaysCountFromStartAndEndDate(startDate, endDate);

	const dailyShiftCounts: Record<
		string,
		{ morning: number; evening: number; night: number; total: number }
	> = {};

	const nurseRows = rows.map((row) => {
		const assignments = (row.assignments ?? {}) as Record<string, Assignment>;

		// Accumulate dailyShiftCounts in a single pass
		for (const [date, assignment] of Object.entries(assignments)) {
			if (!assignment) continue;
			if (!dailyShiftCounts[date]) {
				dailyShiftCounts[date] = {
					morning: 0,
					evening: 0,
					night: 0,
					total: 0,
				};
			}
			if (assignment.shiftType === "morning") dailyShiftCounts[date].morning++;
			else if (assignment.shiftType === "evening")
				dailyShiftCounts[date].evening++;
			else if (assignment.shiftType === "night") dailyShiftCounts[date].night++;
			if (assignment.shiftType !== "off") dailyShiftCounts[date].total++;
		}

		const preferenceMorning = Math.round(
			((Number(row.prefMorning) || 0) / 100) * totalDays,
		);
		const preferenceEvening = Math.round(
			((Number(row.prefEvening) || 0) / 100) * totalDays,
		);
		const preferenceNight = Math.round(
			((Number(row.prefNight) || 0) / 100) * totalDays,
		);

		return {
			nurse: {
				id: row.id as string,
				name: row.name as string,
				active: row.active as boolean,
			},
			assignedShiftMetrics: {
				morning: Number(row.shiftMorning),
				evening: Number(row.shiftEvening),
				night: Number(row.shiftNight),
				total: Number(row.totalAssigned),
			},
			assignments,
			preferenceWiseShiftMetrics: {
				morning: preferenceMorning,
				evening: preferenceEvening,
				night: preferenceNight,
				total: preferenceMorning + preferenceEvening + preferenceNight,
			},
		};
	});

	return { nurseRows, dailyShiftCounts };
}

export async function updateSchedule(id: string, shiftId: string | null) {
	return rosterDb.updateScheduleShift(id, shiftId === "off" ? null : shiftId);
}

// ───────────── GENERATE ROSTER ─────────────

export async function generateRoster(_params: GenerateRosterParams) {}
