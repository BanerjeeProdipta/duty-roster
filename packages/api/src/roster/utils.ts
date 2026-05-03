// ───────────── TYPES ─────────────

export type ScheduleRowInput = {
	id: string;
	date: string;
	nurse: { id: string; name: string };
	shift?: { id: string } | null;
};

export type PreferenceWeight = {
	nurseId: string;
	morning: number;
	evening: number;
	night: number;
	active: boolean;
};

export type ShiftTypeKey = "morning" | "evening" | "night" | "off";

export interface ShiftUpdateResult {
	id: string;
	dateKey: string;
	nurseId: string;
	oldShiftType: ShiftTypeKey | null;
	newShiftType: ShiftTypeKey | null;
}

type ShiftType = "morning" | "evening" | "night";
type DayType = "WEEKDAY" | "FRIDAY";
type ShiftCounts = { morning: number; evening: number; night: number };

export type NursePreferenceProfile = {
	nurseId: string;
	nurseName: string;
	active: boolean;
	preferences: ShiftCounts;
	maxShifts: ShiftCounts;
	assigned: ShiftCounts;
	hardConstraintShift: ShiftType | null;
	consecutiveDays: number;
	consecutiveNights: number;
	nightShiftCooldown: number;
	needsSecondNight: boolean;
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

export const FRIDAY_OFF_NURSES: string[] = [];

// ───────────── DATE HELPERS ─────────────

export function formatDateKey(date: Date | string): string {
	if (typeof date === "string") return date;
	return date.toISOString().split("T")[0] ?? "";
}

export function getMonthDateRange(year: number, month: number) {
	const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
	return { startDate, endDate };
}

export function createUTCDate(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function getDaysInMonth(year: number, month: number): number {
	// month is 1-indexed (1 = January, 2 = February, etc.)
	// Date.UTC uses 0-indexed months, so month=5 (May, 1-indexed) becomes month=5 (June, 0-indexed)
	// Day 0 of next month = last day of current month
	// Example: month=5 (May, 1-indexed) -> Date.UTC(year, 5, 0) = last day of May = 31
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getWeekNumber(
	year: number,
	month: number,
	day: number,
): number {
	const date = new Date(year, month - 1, day);
	const startOfYear = new Date(year, 0, 1);
	const diff = date.getTime() - startOfYear.getTime();
	const oneWeek = 604800000;
	return Math.ceil((diff + startOfYear.getDay() * 86400000) / oneWeek);
}

export function getDaysCountFromStartAndEndDate(
	startDate: Date,
	endDate: Date,
): number {
	const start = new Date(startDate);
	start.setUTCHours(0, 0, 0, 0);
	const end = new Date(endDate);
	end.setUTCHours(0, 0, 0, 0);
	const diff = end.getTime() - start.getTime();
	return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function isFriday(dateStr: string): boolean {
	const parts = dateStr.split("-").map(Number);
	const y = parts[0]!;
	const m = parts[1]!;
	const d = parts[2]!;
	return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 5;
}

export function normalizeDateKey(dateStr: string): string {
	// Handle "YYYY-MM-DD" format properly in UTC
	const parts = dateStr.split("-").map(Number);
	const y = parts[0]!;
	const m = parts[1]!;
	const d = parts[2]!;
	const date = new Date(Date.UTC(y, m - 1, d));
	return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

// ───────────── SHIFT HELPERS ─────────────

export function normalizeShiftId(shiftId?: string | null): string {
	if (!shiftId) return "off";
	return shiftId.replace("shift_", "");
}

export function shiftIdToShiftType(shiftId: string | null): ShiftTypeKey {
	if (!shiftId) return "off";
	if (shiftId.endsWith("morning")) return "morning";
	if (shiftId.endsWith("evening")) return "evening";
	if (shiftId.endsWith("night")) return "night";
	return "off";
}

export function getDayType(year: number, month: number, day: number): DayType {
	const isFriday = new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 5;
	return isFriday ? "FRIDAY" : "WEEKDAY";
}

// ───────────── ROSTER GENERATION HELPERS ─────────────

export function getCoverageForDay(dayType: DayType): ShiftCounts {
	return dayType === "FRIDAY"
		? ROSTER_CONFIG.COVERAGE.FRIDAY
		: ROSTER_CONFIG.COVERAGE.WEEKDAY;
}

export function canAssignShift(
	profile: NursePreferenceProfile,
	shiftType: ShiftType,
	isFriday: boolean,
): boolean {
	if (!profile.active) return false;

	if (isFriday && FRIDAY_OFF_NURSES.includes(profile.nurseId)) return false;

	if (profile.assigned[shiftType] >= profile.maxShifts[shiftType]) {
		return false;
	}

	if (profile.hardConstraintShift) {
		return profile.hardConstraintShift === shiftType;
	}

	if (profile.preferences[shiftType] === 0) return false;

	if (
		profile.consecutiveDays >= ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_DAYS
	) {
		return false;
	}

	if (shiftType === "night") {
		if (
			profile.consecutiveNights >=
			ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS
		) {
			return false;
		}
		if (profile.nightShiftCooldown > 0) {
			return false;
		}
	}

	if (profile.nightShiftCooldown > 0) {
		return false;
	}

	return true;
}

export function getEligibleNurses(
	profiles: Map<string, NursePreferenceProfile>,
	shiftType: ShiftType,
	assignedToday: Set<string>,
	isFriday: boolean,
): NursePreferenceProfile[] {
	const eligible: NursePreferenceProfile[] = [];

	for (const profile of profiles.values()) {
		if (assignedToday.has(profile.nurseId)) continue;

		if (!canAssignShift(profile, shiftType, isFriday)) continue;

		eligible.push(profile);
	}

	eligible.sort((a, b) => {
		const totalA = a.assigned.morning + a.assigned.evening + a.assigned.night;
		const totalB = b.assigned.morning + b.assigned.evening + b.assigned.night;
		if (totalA !== totalB) return totalA - totalB;

		if (shiftType === "night") {
			if (a.needsSecondNight && !b.needsSecondNight) return -1;
			if (!a.needsSecondNight && b.needsSecondNight) return 1;
		}

		const gapA = a.maxShifts[shiftType] - a.assigned[shiftType];
		const gapB = b.maxShifts[shiftType] - b.assigned[shiftType];
		return gapB - gapA;
	});

	return eligible;
}

export function recordShift(
	profile: NursePreferenceProfile,
	shiftType: ShiftType,
): void {
	profile.assigned[shiftType]++;
	profile.consecutiveDays++;

	if (shiftType === "night") {
		profile.consecutiveNights++;
		if (profile.consecutiveNights === 1) {
			profile.needsSecondNight = true;
		} else if (
			profile.consecutiveNights >=
			ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS
		) {
			profile.needsSecondNight = false;
			profile.nightShiftCooldown = 1;
		}
	} else {
		profile.consecutiveNights = 0;
		profile.needsSecondNight = false;
	}
}

export function resetDailyState(
	profiles: Map<string, NursePreferenceProfile>,
): void {
	for (const profile of profiles.values()) {
		profile.consecutiveDays = 0;

		if (profile.nightShiftCooldown > 0) {
			profile.nightShiftCooldown--;
			if (profile.nightShiftCooldown === 0) {
				profile.consecutiveNights = 0;
				profile.needsSecondNight = false;
			}
		}
	}
}

export function assignRequiredShifts(
	year: number,
	month: number,
	profiles: Map<string, NursePreferenceProfile>,
	dayType: DayType,
	day: number,
	assignments: Map<string, { shiftType: ShiftType; nurseId: string }[]>,
) {
	const coverage = getCoverageForDay(dayType);
	const isFriday = dayType === "FRIDAY";
	const assignedToday = new Set<string>();

	const shifts: ShiftType[] = ["morning", "evening", "night"];

	for (const shiftType of shifts) {
		const required = coverage[shiftType];
		const eligible = getEligibleNurses(
			profiles,
			shiftType,
			assignedToday,
			isFriday,
		);
		const chosen = eligible.slice(0, required);

		for (const nurse of chosen) {
			assignedToday.add(nurse.nurseId);
			recordShift(nurse, shiftType);
			const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
			const list = assignments.get(dayKey) ?? [];
			list.push({ shiftType, nurseId: nurse.nurseId });
			assignments.set(dayKey, list);
		}
	}
}

// ───────────── SHIFT REQUIREMENTS HELPERS ─────────────

export function getFridayAndWeekdayCounts(
	startDate: Date,
	endDate: Date,
): { fridayCount: number; weekdayCount: number } {
	let fridayCount = 0;
	let weekdayCount = 0;
	const d = new Date(startDate);
	while (d <= endDate) {
		const dateStr = d.toISOString().split("T")[0] ?? "";
		if (isFriday(dateStr)) {
			fridayCount++;
		} else {
			weekdayCount++;
		}
		d.setDate(d.getDate() + 1);
	}
	return { fridayCount, weekdayCount };
}

export function getShiftRequirementsForMonth(
	year: number,
	month: number,
): ShiftCounts {
	const totalDays = getDaysInMonth(year, month);
	const startDate = new Date(Date.UTC(year, month - 1, 1));
	const endDate = new Date(Date.UTC(year, month - 1, totalDays));
	return getShiftRequirementsForRange(startDate, endDate);
}

export function getShiftRequirementsForRange(
	startDate: Date,
	endDate: Date,
): ShiftCounts {
	const { fridayCount, weekdayCount } = getFridayAndWeekdayCounts(
		startDate,
		endDate,
	);
	return {
		morning:
			weekdayCount * ROSTER_CONFIG.COVERAGE.WEEKDAY.morning +
			fridayCount * ROSTER_CONFIG.COVERAGE.FRIDAY.morning,
		evening:
			(weekdayCount + fridayCount) * ROSTER_CONFIG.COVERAGE.WEEKDAY.evening,
		night: (weekdayCount + fridayCount) * ROSTER_CONFIG.COVERAGE.WEEKDAY.night,
	};
}

export function buildCoverageForMonth(
	year: number,
	month: number,
): { morning: number; evening: number; night: number }[] {
	const totalDays = getDaysInMonth(year, month);
	const coverage: { morning: number; evening: number; night: number }[] = [];
	for (let i = 0; i < totalDays; i++) {
		const date = new Date(Date.UTC(year, month - 1, i + 1));
		const isFri = date.getUTCDay() === 5;
		coverage.push(
			isFri
				? { ...ROSTER_CONFIG.COVERAGE.FRIDAY }
				: { ...ROSTER_CONFIG.COVERAGE.WEEKDAY },
		);
	}
	return coverage;
}

export function getFridayIndicesForMonth(
	year: number,
	month: number,
): number[] {
	const totalDays = getDaysInMonth(year, month);
	const fridayIndices: number[] = [];
	for (let i = 0; i < totalDays; i++) {
		const date = new Date(Date.UTC(year, month - 1, i + 1));
		if (date.getUTCDay() === 5) {
			fridayIndices.push(i);
		}
	}
	return fridayIndices;
}
