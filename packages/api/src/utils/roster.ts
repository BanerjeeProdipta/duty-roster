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
