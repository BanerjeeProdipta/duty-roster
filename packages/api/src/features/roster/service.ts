import type { Assignment } from "@Duty-Roster/db/types/shift";
import * as rosterDb from "./db";
import type { SchedulesResponse } from "./schema";
import {
	createUTCDate,
	getDaysCountFromStartAndEndDate,
	getDaysInMonth,
	getMonthDateRange,
} from "./utils";

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
		MAX_CONSECUTIVE_NIGHTS: 2,
		MAX_CONSECUTIVE_DAYS: 6,
		MIN_DAYS_OFF_PER_WEEK: 1,
	},
} as const;

// ───────────── NURSES WITH FRIDAY OFF ─────────────
export const FRIDAY_OFF_NURSES: string[] = ["nurse_1_id", "nurse_2_id"];

// ───────────── PREFERENCES (merged logic) ─────────────

export async function updateNurseShiftPreferenceWeights(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[],
	daysInMonth: number,
) {
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

export async function upsertSchedule(
	id: string,
	shiftId: string | null,
	nurseId?: string,
	dateKey?: string,
) {
	if (id === "new" && nurseId && dateKey) {
		return rosterDb.createSchedule(nurseId, new Date(dateKey), shiftId);
	}
	if (!id || id === "new") {
		return;
	}
	return rosterDb.updateScheduleShift(id, shiftId === "off" ? null : shiftId);
}

// ───────────── GENERATE ROSTER ─────────────

type ShiftType = "morning" | "evening" | "night";
type DayType = "WEEKDAY" | "FRIDAY";

type ShiftCounts = { morning: number; evening: number; night: number };

type NursePreferenceProfile = {
	nurseId: string;
	nurseName: string;
	active: boolean;
	preferences: ShiftCounts;
	maxShifts: ShiftCounts;
	assigned: ShiftCounts;
	hardConstraintShift: ShiftType | null;
	consecutiveDays: number;
	consecutiveNights: number;
};

function getCoverageForDay(dayType: DayType): ShiftCounts {
	return dayType === "FRIDAY"
		? ROSTER_CONFIG.COVERAGE.FRIDAY
		: ROSTER_CONFIG.COVERAGE.WEEKDAY;
}

function isFridayDay(year: number, month: number, day: number): boolean {
	return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}

function getDayType(year: number, month: number, day: number): DayType {
	return isFridayDay(year, month, day) ? "FRIDAY" : "WEEKDAY";
}

function buildNurseProfiles(
	rows: Awaited<
		ReturnType<typeof rosterDb.findSchedulesAndPreferencesByDateRange>
	>,
	daysInMonth: number,
): Map<string, NursePreferenceProfile> {
	const profiles = new Map<string, NursePreferenceProfile>();

	for (const row of rows) {
		const pm = Number(row.prefMorning) || 0;
		const pe = Number(row.prefEvening) || 0;
		const pn = Number(row.prefNight) || 0;
		const active = row.active as boolean;

		// Calculate max shift limits from preference weights
		const maxMorning = Math.round((pm / 100) * daysInMonth);
		const maxEvening = Math.round((pe / 100) * daysInMonth);
		const maxNight = Math.round((pn / 100) * daysInMonth);

		// Hard constraint: 100% preference for single shift
		let hardConstraintShift: ShiftType | null = null;
		if (pm + pe + pn === 100) {
			if (pm === 100) hardConstraintShift = "morning";
			else if (pe === 100) hardConstraintShift = "evening";
			else if (pn === 100) hardConstraintShift = "night";
		}

		profiles.set(row.id as string, {
			nurseId: row.id as string,
			nurseName: row.name as string,
			active,
			preferences: { morning: pm, evening: pe, night: pn },
			maxShifts: { morning: maxMorning, evening: maxEvening, night: maxNight },
			assigned: { morning: 0, evening: 0, night: 0 },
			hardConstraintShift,
			consecutiveDays: 0,
			consecutiveNights: 0,
		});
	}

	return profiles;
}

function canAssignShift(
	profile: NursePreferenceProfile,
	shiftType: ShiftType,
	isFriday: boolean,
): boolean {
	// 1. Skip inactive nurses
	if (!profile.active) return false;

	// 2. Skip FRIDAY_OFF_NURSES on Fridays
	if (isFriday && FRIDAY_OFF_NURSES.includes(profile.nurseId)) return false;

	// 3. Check if exceeded preference limit for THIS shift type
	if (profile.assigned[shiftType] >= profile.maxShifts[shiftType]) {
		return false;
	}

	// 4. Hard constraint: only allow their preferred shift
	if (profile.hardConstraintShift) {
		return profile.hardConstraintShift === shiftType;
	}

	// 5. If 0% preference for shift type, skip
	if (profile.preferences[shiftType] === 0) return false;

	// 6. Check consecutive days limit
	if (
		profile.consecutiveDays >= ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_DAYS
	) {
		return false;
	}

	// 7. Check consecutive nights limit
	if (shiftType === "night") {
		if (
			profile.consecutiveNights >=
			ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS
		) {
			return false;
		}
	}

	return true;
}

function getNursesEligibleForShift(
	profiles: Map<string, NursePreferenceProfile>,
	shiftType: ShiftType,
	isFriday: boolean,
): NursePreferenceProfile[] {
	const eligible: NursePreferenceProfile[] = [];

	for (const profile of profiles.values()) {
		if (canAssignShift(profile, shiftType, isFriday)) {
			eligible.push(profile);
		}
	}

	// Sort by who is MOST UNDER their preference limit for THIS shift type
	// Lower gap = higher priority (more under their limit)
	eligible.sort((a, b) => {
		const gapA = a.maxShifts[shiftType] - a.assigned[shiftType];
		const gapB = b.maxShifts[shiftType] - b.assigned[shiftType];
		return gapB - gapA; // Descending: nurses who need this shift more come first
	});

	return eligible;
}

function recordShift(
	profile: NursePreferenceProfile,
	shiftType: ShiftType,
): void {
	profile.assigned[shiftType]++;
	profile.consecutiveDays++;

	if (shiftType === "night") {
		profile.consecutiveNights++;
	} else {
		profile.consecutiveNights = 0;
	}
}

function resetConsecutiveDays(
	profiles: Map<string, NursePreferenceProfile>,
	assignedToday: Set<string>,
): void {
	for (const profile of profiles.values()) {
		if (!assignedToday.has(profile.nurseId)) {
			profile.consecutiveDays = 0;
		}
	}
}

/**
 * Generates the roster schedule for a month
 */
export async function generateRoster(params: GenerateRosterParams) {
	const { year, month } = params;
	const daysInMonth = getDaysInMonth(year, month);
	const { startDate, endDate } = getMonthDateRange(year, month);
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	// Build profiles with preference limits
	const profiles = buildNurseProfiles(rows, daysInMonth);

	const schedules: { nurseId: string; shiftId: string | null; date: Date }[] =
		[];

	// Process each day of the month
	for (let day = 1; day <= daysInMonth; day++) {
		const dayType = getDayType(year, month, day);
		const coverage = getCoverageForDay(dayType);
		const isFriday = dayType === "FRIDAY";

		const assignedToday = new Set<string>();

		// For each shift type, assign nurses
		const shiftTypes: ShiftType[] = ["morning", "evening", "night"];

		for (const shiftType of shiftTypes) {
			const slotsNeeded = coverage[shiftType];

			// Get nurses eligible for THIS shift type
			const eligible = getNursesEligibleForShift(profiles, shiftType, isFriday);

			// Assign nurses until slots filled or no more eligible
			let assigned = 0;
			for (const profile of eligible) {
				if (assigned >= slotsNeeded) break;

				// Skip if already assigned a different shift today
				if (assignedToday.has(profile.nurseId)) continue;

				// Check one more time (could have been assigned another shift just now)
				if (!canAssignShift(profile, shiftType, isFriday)) continue;

				// Assign this nurse
				recordShift(profile, shiftType);
				assignedToday.add(profile.nurseId);

				schedules.push({
					nurseId: profile.nurseId,
					shiftId: `shift_${shiftType}`,
					date: createUTCDate(year, month, day),
				});

				assigned++;
			}
		}

		// Reset consecutive days for nurses who didn't work today
		resetConsecutiveDays(profiles, assignedToday);
	}

	// Persist the schedules
	if (schedules.length > 0) {
		await rosterDb.createSchedules(schedules);
	}

	// Build shift counts for response
	const shiftCounts: Record<string, ShiftCounts> = {};
	const totalCounts: Record<string, number> = {};
	for (const profile of profiles.values()) {
		shiftCounts[profile.nurseName] = { ...profile.assigned };
		totalCounts[profile.nurseName] =
			profile.assigned.morning +
			profile.assigned.evening +
			profile.assigned.night;
	}

	// Sort by total shifts for logging
	const sortedNurses = Object.entries(totalCounts).sort((a, b) => a[1] - b[1]);

	return {
		generated: true,
		daysInMonth,
		schedulesCreated: schedules.length,
		shiftCounts,
		sortedNurses,
	};
}
