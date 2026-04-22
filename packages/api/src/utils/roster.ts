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

/**
 * Roster Utility Functions
 * Centralized logic for date manipulation and shift normalization
 */

/**
 * Normalizes a date to YYYY-MM-DD string format
 */
export function formatDateKey(date: Date | string): string {
	if (typeof date === "string") return date;
	return date.toISOString().split("T")[0] ?? "";
}

/**
 * Strips 'shift_' prefix from shift IDs and handles default 'off' state
 */
export function normalizeShiftId(shiftId?: string | null): string {
	if (!shiftId) return "off";
	return shiftId.replace("shift_", "");
}

/**
 * Calculates start and end Date objects for a given month and year
 */
export function getMonthDateRange(year: number, month: number) {
	// Month is 1-12 from Zod input
	const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
	const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
	return { startDate, endDate };
}

/**
 * Creates a UTC Noon date for a given year, month (1-12), and day
 */
export function createUTCDate(year: number, month: number, day: number): Date {
	return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

export function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
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

export function isFriday(year: number, month: number, day: number): boolean {
	return new Date(year, month - 1, day).getDay() === 5;
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
