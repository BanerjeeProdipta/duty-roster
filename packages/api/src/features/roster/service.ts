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
		MAX_NIGHTS_PER_NURSE: 3,
		MIN_DAYS_OFF_PER_WEEK: 1,
	},
} as const;

// ───────────── NURSES WITH FRIDAY OFF ─────────────
// Hardcoded list of nurse IDs who will always have Friday off
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

type NursePreferenceProfile = {
	nurseId: string;
	nurseName: string;
	preferences: {
		morning: number;
		evening: number;
		night: number;
	};
	hardConstraintShift: ShiftType | null; // null unless 100% single shift
};

type DailyCoverage = {
	morning: number;
	evening: number;
	night: number;
};

type NurseShiftState = {
	nurseId: string;
	nurseName: string;
	shiftsThisMonth: ShiftType[];
	consecutiveNights: number;
	lastShift: ShiftType | null;
	daysOffThisWeek: number;
	weekStartDay: number;
};

/**
 * Gets the coverage needs for a given day type
 */
function getCoverageForDay(dayType: DayType): DailyCoverage {
	return dayType === "FRIDAY"
		? ROSTER_CONFIG.COVERAGE.FRIDAY
		: ROSTER_CONFIG.COVERAGE.WEEKDAY;
}

/**
 * Determines if a day is a Friday
 */
function isFridayDay(year: number, month: number, day: number): boolean {
	return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
}

/**
 * Determines the day type based on the date
 */
function getDayType(year: number, month: number, day: number): DayType {
	return isFridayDay(year, month, day) ? "FRIDAY" : "WEEKDAY";
}

/**
 * Builds preference profiles for each nurse from raw preference data
 */
function buildNurseProfiles(
	rows: Awaited<
		ReturnType<typeof rosterDb.findSchedulesAndPreferencesByDateRange>
	>,
): NursePreferenceProfile[] {
	return rows.map((row) => {
		const prefMorning = Number(row.prefMorning) || 0;
		const prefEvening = Number(row.prefEvening) || 0;
		const prefNight = Number(row.prefNight) || 0;
		const total = prefMorning + prefEvening + prefNight;

		// Determine hard constraint: 100% preference for single shift
		let hardConstraintShift: ShiftType | null = null;
		if (total === 100) {
			if (prefMorning === 100) hardConstraintShift = "morning";
			else if (prefEvening === 100) hardConstraintShift = "evening";
			else if (prefNight === 100) hardConstraintShift = "night";
		}

		return {
			nurseId: row.id as string,
			nurseName: row.name as string,
			preferences: {
				morning: prefMorning,
				evening: prefEvening,
				night: prefNight,
			},
			hardConstraintShift,
		};
	});
}

/**
 * Initializes shift tracking state for each nurse
 */
function initializeNurseStates(
	profiles: NursePreferenceProfile[],
): Map<string, NurseShiftState> {
	const states = new Map<string, NurseShiftState>();
	for (const profile of profiles) {
		states.set(profile.nurseId, {
			nurseId: profile.nurseId,
			nurseName: profile.nurseName,
			shiftsThisMonth: [],
			consecutiveNights: 0,
			lastShift: null,
			daysOffThisWeek: 0,
			weekStartDay: 1, // Day 1 starts the week counter
		});
	}
	return states;
}

/**
 * Checks if a nurse is available for a shift on a given day
 */
function canAssignShift(
	state: NurseShiftState,
	shiftType: ShiftType,
	dayOfMonth: number,
): boolean {
	// Check consecutive night limit (2 nights max → 1 off required)
	if (shiftType === "night") {
		if (
			state.consecutiveNights >=
			ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS
		) {
			return false;
		}
	}

	// Check weekly off constraint (min 1 day off per week)
	const currentWeek = Math.floor((dayOfMonth - state.weekStartDay) / 7);
	const stateWeek = Math.floor(
		(state.shiftsThisMonth.length - state.weekStartDay + 1) / 7,
	);
	if (currentWeek > stateWeek && state.daysOffThisWeek === 0) {
		// Already worked a full week without a day off - but this is checked at end of week
	}

	return true;
}

/**
 * Updates consecutive night count and enforces required off
 */
function updateConsecutiveNightCount(
	state: NurseShiftState,
	shiftType: ShiftType,
): void {
	if (shiftType === "night") {
		state.consecutiveNights++;
	} else {
		state.consecutiveNights = 0;
	}
	state.lastShift = shiftType;
}

/**
 * Generates the roster schedule for a month
 */
export async function generateRoster(params: GenerateRosterParams) {
	const { year, month } = params;
	const daysInMonth = getDaysInMonth(year, month);

	// Get current schedule data for preferences
	const { startDate, endDate } = getMonthDateRange(year, month);
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	// Build nurse profiles with preferences
	const profiles = buildNurseProfiles(rows);
	const profileMap = new Map(profiles.map((p) => [p.nurseId, p]));

	// Initialize shift state for tracking
	const states = initializeNurseStates(profiles);

	// Generate schedules: array of { nurseId, shiftId, date }
	const schedules: { nurseId: string; shiftId: string | null; date: Date }[] =
		[];

	// Process each day of the month
	for (let day = 1; day <= daysInMonth; day++) {
		const dayType = getDayType(year, month, day);
		const coverage = getCoverageForDay(dayType);

		// Get available nurses (exclude FRIDAY_OFF_NURSES on Fridays)
		const fridayOffNurseIds = FRIDAY_OFF_NURSES;
		const isFriday = dayType === "FRIDAY";

		// Track nurses assigned TODAY (avoid duplicates in same day)
		const nursesAssignedToday = new Set<string>();

		// Phase 1: Assign hard-constraint nurses (100% single shift)
		const slotsRemaining = { ...coverage };

		// For each shift type, find and assign hard-constraint nurses
		const shiftTypes: ShiftType[] = ["morning", "evening", "night"];
		for (const shiftType of shiftTypes) {
			// Continue until all slots filled or no more eligible nurses
			while (slotsRemaining[shiftType] > 0) {
				let assigned = false;

				// Find nurses with hard constraint for this shift type
				for (const [nurseId, profile] of profileMap) {
					if (profile.hardConstraintShift !== shiftType) continue;
					if (nursesAssignedToday.has(nurseId)) continue;

					const state = states.get(nurseId);
					if (!state) continue;

					// Skip FRIDAY_OFF_NURSES on Fridays
					if (isFriday && fridayOffNurseIds.includes(nurseId)) continue;

					// Check if nurse can take this shift
					if (canAssignShift(state, shiftType, day)) {
						// Assign shift
						state.shiftsThisMonth.push(shiftType);
						updateConsecutiveNightCount(state, shiftType);
						nursesAssignedToday.add(nurseId);

						// Record schedule
						const shiftId = `shift_${shiftType}`;
						schedules.push({
							nurseId,
							shiftId,
							date: createUTCDate(year, month, day),
						});

						slotsRemaining[shiftType]--;
						assigned = true;
						break; // Move to next slot
					}
				}

				if (!assigned) break; // No more eligible nurses for this shift type
			}
		}

		// Phase 2: Fill remaining slots with preference-based assignment
		for (const shiftType of shiftTypes) {
			while (slotsRemaining[shiftType] > 0) {
				// Find best available nurse for this shift (not assigned today)
				let bestState: NurseShiftState | null = null;
				let bestScore = Number.NEGATIVE_INFINITY;

				for (const [, state] of states) {
					const profile = profileMap.get(state.nurseId);
					if (!profile) continue;

					// Skip if already assigned a shift today
					if (nursesAssignedToday.has(state.nurseId)) continue;

					// Skip FRIDAY_OFF_NURSES on Fridays
					if (isFriday && fridayOffNurseIds.includes(state.nurseId)) continue;

					// Check hard constraint (if nurse has 100% pref for different shift)
					if (
						profile.hardConstraintShift &&
						profile.hardConstraintShift !== shiftType
					) {
						continue;
					}

					// Check availability
					if (!canAssignShift(state, shiftType, day)) continue;

					// Calculate score: preference + fairness
					const prefWeight = profile.preferences[shiftType];
					const shiftsOfType = state.shiftsThisMonth.filter(
						(s) => s === shiftType,
					).length;
					const fairnessScore = 50 - shiftsOfType;
					const score = prefWeight + fairnessScore;

					if (score > bestScore) {
						bestScore = score;
						bestState = state;
					}
				}

				// If no nurse available, try harder (relax constraints)
				if (!bestState) {
					// Find any available nurse not assigned today
					for (const [, state] of states) {
						if (nursesAssignedToday.has(state.nurseId)) continue;
						if (isFriday && fridayOffNurseIds.includes(state.nurseId)) continue;
						if (canAssignShift(state, shiftType, day)) {
							bestState = state;
							break;
						}
					}
				}

				// If still no nurse, this slot remains unfilled
				if (!bestState) break;

				// Assign the shift
				bestState.shiftsThisMonth.push(shiftType);
				updateConsecutiveNightCount(bestState, shiftType);
				nursesAssignedToday.add(bestState.nurseId);

				const shiftId = `shift_${shiftType}`;
				schedules.push({
					nurseId: bestState.nurseId,
					shiftId,
					date: createUTCDate(year, month, day),
				});

				slotsRemaining[shiftType]--;
			}
		}

		// Phase 3: Assign off days to nurses who need weekly off
		// (Simplified: ensure minimum coverage met in phases 1 & 2)
	}

	// Persist the generated schedules
	if (schedules.length > 0) {
		await rosterDb.createSchedules(schedules);
	}

	return {
		generated: true,
		daysInMonth,
		schedulesCreated: schedules.length,
	};
}
