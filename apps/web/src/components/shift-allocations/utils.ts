import type { NurseData, NurseState } from "./types";

export interface MonthNavigatorProps {
	year?: number;
	month?: number;
}

export async function getYearMonthFromSearchParams(
	searchParams: Promise<{ year?: string; month?: string }>,
) {
	const params = await searchParams;
	const today = new Date();
	const year = params.year
		? Number.parseInt(params.year, 10)
		: today.getFullYear();
	const month = params.month
		? Number.parseInt(params.month, 10)
		: today.getMonth() + 1;
	return { year, month };
}

export function normalize(data: unknown, totalDays: number): NurseState[] {
	if (!Array.isArray(data)) return [];

	return (data as NurseData[]).map((item) => {
		const m = Math.round((item.morning / 100) * totalDays);
		const e = Math.round((item.evening / 100) * totalDays);
		const n = Math.round((item.night / 100) * totalDays);
		const off = Math.max(0, totalDays - m - e - n);
		return {
			nurseId: item.nurseId,
			name: item.name,
			morning: m,
			evening: e,
			night: n,
			off,
			active: item.active ?? true,
		};
	});
}

/**
 * Safely adds months to a date input (Date | string | number)
 */
export function addMonths(date: Date | string | number, delta: number) {
	const d = new Date(date);

	if (isNaN(d.getTime())) {
		throw new Error("Invalid date passed to addMonths");
	}

	d.setMonth(d.getMonth() + delta);
	return d;
}

/**
 * Formats a date into "Month Year"
 */
export function formatMonth(date: Date | string | number) {
	const d = new Date(date);

	if (isNaN(d.getTime())) {
		throw new Error("Invalid date passed to formatMonth");
	}

	return d.toLocaleString("default", {
		month: "long",
		year: "numeric",
	});
}

/**
 * FIXED: Prevents runtime crash when non-Date is passed
 */
export function getDaysInMonth(date: Date | string | number) {
	const d = new Date(date);

	if (isNaN(d.getTime())) {
		throw new Error("Invalid date passed to getDaysInMonth");
	}

	return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
