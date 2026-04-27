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
	ALLOW_OVER_PREFERENCE: 0, // No exceeding preference limits
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

function isFriday(dateStr: string): boolean {
	const parts = dateStr.split("-").map(Number);
	const y = parts[0]!;
	const m = parts[1]!;
	const d = parts[2]!;
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;
}

function normalizeDateKey(dateStr: string): string {
	const date = new Date(dateStr);
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Fetches schedules and preferences for a date range and computes aggregated metrics.
 *
 * Response Properties:
 * ─────────────────────────────────────────────────────────────────────────────────
 * nurseRows              : Array of all nurses with their shift assignments for
 *                        each day in the range. Each row contains:
 *   - nurse             : { id, name, active } - Nurse info
 *   - assignments       : { [dateKey]: { id, shiftType } | null } - Shifts per day
 *   - preferenceWiseShiftMetrics : How many shifts this nurse prefers (calculated from %)
 *   - assignedShiftMetrics       : How many shifts this nurse actually worked
 *
 * dailyShiftCounts      : Aggregated count of shifts per day across all nurses.
 *                        Used by UI to show today's staffing levels.
 *   - Key: "YYYY-MM-DD" (UTC normalized date)
 *   - Value: { morning, evening, night, total } number of nurses assigned
 *
 * shiftRequirements     : Target staffing levels based on coverage config.
 *                        - Weekdays: 20 morning, 3 evening, 2 night
 *                        - Fridays:  3 morning, 3 evening, 2 night
 *
 * assignedShiftCounts   : Actual total shifts assigned across entire date range.
 *                        Used by UI cards to show "X assigned / Y required"
 *
 * preferenceCapacity    : Sum of all nurses' preferred shift counts.
 *                        Represents total shift capacity based on preferences.
 * ─────────────────────────────────────────────────────────────────────────────────
 */
export async function getSchedulesByDateRange(
	startDate: Date,
	endDate: Date,
): Promise<SchedulesResponse> {
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	const totalDays = getDaysCountFromStartAndEndDate(startDate, endDate);

	// dailyShiftCounts: Tracks how many nurses are working each shift type per day
	// Key: "YYYY-MM-DD", Value: { morning, evening, night, total }
	// Example: { "2026-04-01": { morning: 18, evening: 3, night: 2, total: 23 } }
	const dailyShiftCounts: Record<
		string,
		{ morning: number; evening: number; night: number; total: number }
	> = {};

	const nurseRows = rows.map((row) => {
		const rawAssignments = (row.assignments ?? {}) as Record<
			string,
			Assignment
		>;
		const assignments: Record<string, Assignment> = {};

		for (const [date, assignment] of Object.entries(rawAssignments)) {
			// Normalize date keys to UTC to ensure consistency
			const normalizedDate = normalizeDateKey(date);
			assignments[normalizedDate] = assignment;

			if (!assignment) continue;

			// Initialize day entry if not exists
			if (!dailyShiftCounts[normalizedDate]) {
				dailyShiftCounts[normalizedDate] = {
					morning: 0,
					evening: 0,
					night: 0,
					total: 0,
				};
			}

			// Increment the appropriate shift type counter
			if (assignment.shiftType === "morning")
				dailyShiftCounts[normalizedDate].morning++;
			else if (assignment.shiftType === "evening")
				dailyShiftCounts[normalizedDate].evening++;
			else if (assignment.shiftType === "night")
				dailyShiftCounts[normalizedDate].night++;
			if (assignment.shiftType !== "off")
				dailyShiftCounts[normalizedDate].total++;
		}

		// Calculate preference-based shift counts for this nurse
		// Example: 30% morning preference on 30-day month = 9 morning shifts preferred
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

	// assignedShiftCounts: Total shifts actually worked across all nurses
	// Aggregated from dailyShiftCounts - used in UI cards
	const assignedShiftCounts = {
		morning: 0,
		evening: 0,
		night: 0,
		total: 0,
	};

	// preferenceCapacity: Sum of all nurses' preferred shift counts
	// Represents theoretical maximum capacity based on preferences
	const preferenceCapacity = {
		morning: 0,
		evening: 0,
		night: 0,
		total: 0,
	};

	// Sum up actual assigned shifts from daily counts
	for (const [, counts] of Object.entries(dailyShiftCounts)) {
		assignedShiftCounts.morning += counts.morning ?? 0;
		assignedShiftCounts.evening += counts.evening ?? 0;
		assignedShiftCounts.night += counts.night ?? 0;
		assignedShiftCounts.total += counts.total ?? 0;
	}

	// Sum up preference-based capacity from each nurse's metrics
	for (const row of nurseRows) {
		const pref = row.preferenceWiseShiftMetrics;
		preferenceCapacity.morning += pref.morning ?? 0;
		preferenceCapacity.evening += pref.evening ?? 0;
		preferenceCapacity.night += pref.night ?? 0;
		preferenceCapacity.total += pref.total ?? 0;
	}

	// Count weekdays and Fridays to calculate coverage requirements
	let fridayCount = 0;
	let weekdayCount = 0;

	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		const dateStr = d.toISOString().split("T")[0] ?? "";
		if (isFriday(dateStr)) {
			fridayCount++;
		} else {
			weekdayCount++;
		}
	}

	// shiftRequirements: Target staffing based on coverage config
	// - Weekdays: 20 morning, 3 evening, 2 night
	// - Fridays: 3 morning (reduced), 3 evening, 2 night
	const shiftRequirements = {
		morning: weekdayCount * 20 + fridayCount * 3,
		evening: (weekdayCount + fridayCount) * 3,
		night: (weekdayCount + fridayCount) * 2,
		total:
			weekdayCount * 20 +
			fridayCount * 3 +
			(weekdayCount + fridayCount) * 3 +
			(weekdayCount + fridayCount) * 2,
	};

	return {
		nurseRows,
		dailyShiftCounts,
		shiftRequirements,
		assignedShiftCounts,
		preferenceCapacity,
	};
}

export type ShiftTypeKey = "morning" | "evening" | "night" | "off";

export interface ShiftUpdateResult {
	id: string;
	dateKey: string;
	nurseId: string;
	oldShiftType: ShiftTypeKey | null;
	newShiftType: ShiftTypeKey | null;
}

function shiftIdToShiftType(shiftId: string | null): ShiftTypeKey {
	if (!shiftId) return "off";
	if (shiftId.endsWith("morning")) return "morning";
	if (shiftId.endsWith("evening")) return "evening";
	if (shiftId.endsWith("night")) return "night";
	return "off";
}

export async function upsertSchedule(
	id: string,
	shiftId: string | null,
	nurseId?: string,
	dateKey?: string,
): Promise<ShiftUpdateResult | null> {
	let oldShiftType: ShiftTypeKey | null = null;

	if (id === "new" && nurseId && dateKey) {
		const createdId = `schedule_${nurseId}_${dateKey}`;
		await rosterDb.createSchedule(nurseId, new Date(dateKey), shiftId);
		return {
			id: createdId,
			dateKey: dateKey,
			nurseId,
			oldShiftType: null,
			newShiftType: shiftIdToShiftType(shiftId),
		};
	}

	if (!id || id === "new") {
		return null;
	}

	// Fetch current state before update to get oldShiftType
	const existing = await rosterDb.findScheduleById(id);
	if (existing?.shiftId) {
		oldShiftType = shiftIdToShiftType(existing.shiftId as string);
	}

	await rosterDb.updateScheduleShift(id, shiftId === "off" ? null : shiftId);

	const resultShiftType = shiftIdToShiftType(shiftId);

	return {
		id,
		dateKey: dateKey || "",
		nurseId: nurseId || "",
		oldShiftType,
		newShiftType: resultShiftType,
	};
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

		// Calculate max shift limits from preference weights + buffer
		const buffer = ROSTER_CONFIG.ALLOW_OVER_PREFERENCE;
		const maxMorning = Math.round((pm / 100) * daysInMonth) + buffer;
		const maxEvening = Math.round((pe / 100) * daysInMonth) + buffer;
		const maxNight = Math.round((pn / 100) * daysInMonth) + buffer;

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
	// Skip inactive nurses
	if (!profile.active) return false;

	// Skip FRIDAY_OFF_NURSES on Fridays
	if (isFriday && FRIDAY_OFF_NURSES.includes(profile.nurseId)) return false;

	// Check if exceeded max shifts for this shift type (+ buffer)
	if (profile.assigned[shiftType] >= profile.maxShifts[shiftType]) {
		return false;
	}

	// Hard constraint: only allow their preferred shift
	if (profile.hardConstraintShift) {
		return profile.hardConstraintShift === shiftType;
	}

	// Skip if 0% preference for this shift type
	if (profile.preferences[shiftType] === 0) return false;

	// Check 6-day consecutive limit
	if (
		profile.consecutiveDays >= ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_DAYS
	) {
		return false;
	}

	// Check 2-night consecutive limit
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

function getEligibleNurses(
	profiles: Map<string, NursePreferenceProfile>,
	shiftType: ShiftType,
	assignedToday: Set<string>,
	isFriday: boolean,
): NursePreferenceProfile[] {
	const eligible: NursePreferenceProfile[] = [];

	for (const profile of profiles.values()) {
		// Skip if already assigned a different shift today
		if (assignedToday.has(profile.nurseId)) continue;

		// Check if can assign this shift
		if (!canAssignShift(profile, shiftType, isFriday)) continue;

		eligible.push(profile);
	}

	// CRITICAL: Sort by total shifts assigned (fairness) then by gap for this shift type
	eligible.sort((a, b) => {
		// Primary: lowest TOTAL shifts (most under-assigned)
		const totalA = a.assigned.morning + a.assigned.evening + a.assigned.night;
		const totalB = b.assigned.morning + b.assigned.evening + b.assigned.night;
		if (totalA !== totalB) return totalA - totalB;

		// Secondary: largest gap from preference limit for this shift type
		const gapA = a.maxShifts[shiftType] - a.assigned[shiftType];
		const gapB = b.maxShifts[shiftType] - b.assigned[shiftType];
		return gapB - gapA;
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
 * Generates perfect roster distribution
 */
export async function generateRoster(params: GenerateRosterParams) {
	const { year, month } = params;
	const daysInMonth = getDaysInMonth(year, month);
	const { startDate, endDate } = getMonthDateRange(year, month);
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	const profiles = buildNurseProfiles(rows, daysInMonth);

	const schedules: { nurseId: string; shiftId: string | null; date: Date }[] =
		[];

	// Calculate total preference counts for sorting (highest demand first)
	const preferenceCounts = { morning: 0, evening: 0, night: 0 };
	for (const profile of profiles.values()) {
		if (profile.active) {
			if (profile.preferences.night > 0) preferenceCounts.night++;
			if (profile.preferences.morning > 0) preferenceCounts.morning++;
			if (profile.preferences.evening > 0) preferenceCounts.evening++;
		}
	}

	// Sort shifts by flexibility: least flexible first (fewest preferences = harder to fill)
	const shiftDemand: ShiftType[] = ["night", "morning", "evening"].sort(
		(a, b) => {
			return (
				preferenceCounts[a as keyof typeof preferenceCounts] -
				preferenceCounts[b as keyof typeof preferenceCounts]
			);
		},
	) as ShiftType[];

	// Process each day of the month
	for (let day = 1; day <= daysInMonth; day++) {
		const dayType = getDayType(year, month, day);
		const coverage = getCoverageForDay(dayType);
		const isFriday = dayType === "FRIDAY";

		const assignedToday = new Set<string>();

		// For each shift type (in demand order), assign nurses
		for (const shiftType of shiftDemand) {
			const slotsNeeded = coverage[shiftType];
			let assignedCount = 0;

			// Get eligible nurses, sorted by who needs it most
			const eligible = getEligibleNurses(
				profiles,
				shiftType,
				assignedToday,
				isFriday,
			);

			// Assign until slots filled or no more eligible
			for (const profile of eligible) {
				if (assignedToday.has(profile.nurseId)) continue;

				// Final check before assigning
				if (!canAssignShift(profile, shiftType, isFriday)) continue;

				// Assign this nurse
				recordShift(profile, shiftType);
				assignedToday.add(profile.nurseId);

				schedules.push({
					nurseId: profile.nurseId,
					shiftId: `shift_${shiftType}`,
					date: createUTCDate(year, month, day),
				});

				assignedCount++;

				if (assignedCount >= slotsNeeded) break;
			}
		}

		// Reset consecutive days for nurses who didn't work today
		resetConsecutiveDays(profiles, assignedToday);
	}

	// Persist the schedules
	if (schedules.length > 0) {
		await rosterDb.createSchedules(schedules);
	}

	// Calculate summary
	const totalAssigned = { morning: 0, evening: 0, night: 0 };
	const totalNeeded = { morning: 0, evening: 0, night: 0 };

	for (let d = 1; d <= daysInMonth; d++) {
		const dt = getDayType(year, month, d);
		const cov = getCoverageForDay(dt);
		totalNeeded.morning += cov.morning;
		totalNeeded.evening += cov.evening;
		totalNeeded.night += cov.night;
	}

	for (const profile of profiles.values()) {
		totalAssigned.morning += profile.assigned.morning;
		totalAssigned.evening += profile.assigned.evening;
		totalAssigned.night += profile.assigned.night;
	}

	// Build response
	const shiftCounts: Record<string, ShiftCounts> = {};
	const totalPerNurse: Record<string, number> = {};
	for (const profile of profiles.values()) {
		shiftCounts[profile.nurseName] = { ...profile.assigned };
		totalPerNurse[profile.nurseName] =
			profile.assigned.morning +
			profile.assigned.evening +
			profile.assigned.night;
	}

	const sortedNurses = Object.entries(totalPerNurse).sort(
		(a, b) => a[1] - b[1],
	);

	return {
		generated: true,
		daysInMonth,
		schedulesCreated: schedules.length,
		shiftCounts,
		sortedNurses,
		summary: {
			morning: { needed: totalNeeded.morning, assigned: totalAssigned.morning },
			evening: { needed: totalNeeded.evening, assigned: totalAssigned.evening },
			night: { needed: totalNeeded.night, assigned: totalAssigned.night },
		},
	};
}
