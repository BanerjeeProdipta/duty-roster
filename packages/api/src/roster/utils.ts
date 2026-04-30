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
	ALLOW_OVER_PREFERENCE: 10,
} as const;

export const FRIDAY_OFF_NURSES: string[] = ["nurse_1_id", "nurse_2_id"];

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
	const date = new Date(dateStr);
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildNurseProfiles(
	rows: any[],
	daysInMonth: number,
): Map<string, NursePreferenceProfile> {
	const profiles = new Map<string, NursePreferenceProfile>();

	for (const row of rows) {
		const pm = Number(row.prefMorning) || 0;
		const pe = Number(row.prefEvening) || 0;
		const pn = Number(row.prefNight) || 0;
		const active = row.active as boolean;

		const buffer = ROSTER_CONFIG.ALLOW_OVER_PREFERENCE;
		const maxMorning = Math.round((pm / 100) * daysInMonth) + buffer;
		const maxEvening = Math.round((pe / 100) * daysInMonth) + buffer;
		const maxNight = Math.round((pn / 100) * daysInMonth) + buffer;

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
			nightShiftCooldown: 0,
			needsSecondNight: false,
		});
	}

	return profiles;
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

function compareNurses(
	a: NursePreferenceProfile,
	b: NursePreferenceProfile,
	shiftType: ShiftType,
): number {
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
}

export function getEligibleNurses(
	profiles: Map<string, NursePreferenceProfile>,
	shiftType: ShiftType,
	assignedToday: Set<string>,
	isFriday: boolean,
): NursePreferenceProfile[] {
	const eligible: NursePreferenceProfile[] = [];
	const fridayOff = FRIDAY_OFF_NURSES;
	const maxConsecutiveDays = ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_DAYS;
	const maxConsecutiveNights = ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS;

	for (const profile of profiles.values()) {
		if (assignedToday.has(profile.nurseId)) continue;
		if (!profile.active) continue;
		if (isFriday && fridayOff.includes(profile.nurseId)) continue;

		const maxShift = profile.maxShifts[shiftType];
		if (profile.assigned[shiftType] >= maxShift) continue;
		if (
			profile.hardConstraintShift &&
			profile.hardConstraintShift !== shiftType
		)
			continue;
		if (profile.preferences[shiftType] === 0) continue;
		if (profile.consecutiveDays >= maxConsecutiveDays) continue;

		if (shiftType === "night") {
			if (profile.consecutiveNights >= maxConsecutiveNights) continue;
			if (profile.nightShiftCooldown > 0) continue;
		}

		eligible.push(profile);
	}

	if (eligible.length <= 1) return eligible;

	eligible.sort((a, b) => compareNurses(a, b, shiftType));

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
	daysInMonth: number,
) {
	const coverage = getCoverageForDay(dayType);
	const isFriday = dayType === "FRIDAY";
	const assignedToday = new Set<string>();

	// Calculate pref vs required ratio for dynamic shift ordering
	const shiftRatios: { shiftType: ShiftType; ratio: number }[] = [];

	for (const st of ["morning", "evening", "night"] as ShiftType[]) {
		// Sum preferences across all nurses
		let totalPref = 0;
		for (const profile of profiles.values()) {
			totalPref += profile.preferences[st];
		}

		// Calculate exact total required by counting weekdays and Fridays
		let totalRequired = 0;
		for (let d = 1; d <= daysInMonth; d++) {
			const date = new Date(Date.UTC(year, month - 1, d));
			const dayType = date.getUTCDay() === 5 ? "FRIDAY" : "WEEKDAY";
			const cov =
				dayType === "FRIDAY"
					? ROSTER_CONFIG.COVERAGE.FRIDAY
					: ROSTER_CONFIG.COVERAGE.WEEKDAY;
			totalRequired += cov[st];
		}

		// Ratio: lower = more constrained = assign first
		const ratio = totalRequired > 0 ? totalPref / totalRequired : 999;
		shiftRatios.push({ shiftType: st, ratio });
	}

	// Sort by ratio ascending (lowest ratio = most constrained = first)
	shiftRatios.sort((a, b) => a.ratio - b.ratio);

	const shifts = shiftRatios.map((s) => s.shiftType);

	for (const shiftType of shifts) {
		const required = coverage[shiftType];
		const eligible = getEligibleNurses(
			profiles,
			shiftType,
			assignedToday,
			isFriday,
		);

		// Debug: count why nurses are not eligible
		if (eligible.length < required) {
			const reasons = {
				assignedToday: 0,
				inactive: 0,
				fridayOff: 0,
				maxShifts: 0,
				hardConstraint: 0,
				noPref: 0,
				consecutiveDays: 0,
				nightConstraint: 0,
			};
			for (const profile of profiles.values()) {
				if (assignedToday.has(profile.nurseId)) reasons.assignedToday++;
				else if (!profile.active) reasons.inactive++;
				else if (isFriday && FRIDAY_OFF_NURSES.includes(profile.nurseId))
					reasons.fridayOff++;
				else if (profile.assigned[shiftType] >= profile.maxShifts[shiftType])
					reasons.maxShifts++;
				else if (
					profile.hardConstraintShift &&
					profile.hardConstraintShift !== shiftType
				)
					reasons.hardConstraint++;
				else if (profile.preferences[shiftType] === 0) reasons.noPref++;
				else if (
					profile.consecutiveDays >=
					ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_DAYS
				)
					reasons.consecutiveDays++;
				else if (
					shiftType === "night" &&
					profile.consecutiveNights >=
						ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS
				)
					reasons.nightConstraint++;
			}
			console.log(
				`Day ${day} ${shiftType}: need ${required}, eligible ${eligible.length}, reasons:`,
				reasons,
			);
		}

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
