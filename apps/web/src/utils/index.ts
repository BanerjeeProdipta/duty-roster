export interface NurseState {
	nurseId: string;
	name: string;
	morning: number;
	evening: number;
	night: number;
	off: number;
	active: boolean;
}

export interface NurseData {
	nurseId: string;
	name: string;
	morning: number;
	evening: number;
	night: number;
	active?: boolean;
}

export interface MonthNavigatorProps {
	year?: number;
	month?: number;
}

export function getMonthName(year: number, month: number): string {
	return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

export function getMonthDates(year?: number, month?: number): string[] {
	const now = new Date();
	const y = year ?? now.getFullYear();
	const m = month ?? now.getMonth() + 1;

	const dates: string[] = [];
	const lastDay = new Date(y, m, 0).getDate();

	for (let d = 1; d <= lastDay; d++) {
		dates.push(
			`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
		);
	}

	return dates;
}

export function getMonthDateRange(year?: number, month?: number) {
	const now = new Date();
	const y = year ?? now.getFullYear();
	const m = month ?? now.getMonth() + 1;

	const lastDay = new Date(y, m, 0).getDate();
	const startStr = `${y}-${String(m).padStart(2, "0")}-01`;
	const endStr = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

	return {
		startDate: startStr,
		endDate: endStr,
	};
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

export function addMonths(date: Date | string | number, delta: number) {
	const d = new Date(date);

	if (isNaN(d.getTime())) {
		throw new Error("Invalid date passed to addMonths");
	}

	d.setMonth(d.getMonth() + delta);
	return d;
}

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

export function getDaysInMonth(date: Date | string | number) {
	const d = new Date(date);

	if (isNaN(d.getTime())) {
		throw new Error("Invalid date passed to getDaysInMonth");
	}

	return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}
