import type { ShiftType } from "./roster-matrix.types";

export const STORAGE_KEY = "roster-shifts";
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getMonthDates(year: number, month: number): string[] {
	const dates: string[] = [];
	const lastDay = new Date(year, month, 0).getDate();

	for (let d = 1; d <= lastDay; d++) {
		// Use local date format to avoid timezone issues
		const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
		dates.push(dateStr);
	}

	return dates;
}

export function getMonthDateRange(year: number, month: number) {
	const dates = getMonthDates(year, month);
	const today = new Date();
	const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
	return {
		dates,
		startDate: dates[0] ?? todayStr,
		endDate: dates[dates.length - 1] ?? todayStr,
	};
}

export function getMonthName(year: number, month: number): string {
	return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

export function getMonthOptions(): {
	year: number;
	month: number;
	label: string;
}[] {
	const options: { year: number; month: number; label: string }[] = [];
	const today = new Date();

	// Generate 12 months back and 12 months forward
	for (let offset = -12; offset <= 12; offset++) {
		const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
		options.push({
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			label: getMonthName(date.getFullYear(), date.getMonth() + 1),
		});
	}

	return options;
}

export type ScheduleRow = {
	id: string;
	date: string;
	nurse: {
		id: string;
		name: string;
	};
	shift: {
		id: string;
	} | null;
};

export type ShiftCounts = {
	morning: number;
	evening: number;
	night: number;
	totalAssigned: number;
};

export type SchedulesResponse = {
	schedules: ScheduleRow[];
	dailyShiftCounts: {
		date: string;
		shifts: ShiftCounts;
	}[];
	nurseShiftCounts: {
		nurse: {
			id: string;
			name: string;
		};
		shifts: ShiftCounts;
	}[];
};

export function formatDate(date: Date): string {
	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getWeekDates(offset: number): string[] {
	const today = new Date();
	const currentDay = today.getDate();
	const startOfWeek = new Date(today);
	startOfWeek.setDate(currentDay - today.getDay() + 1 + offset * 7);

	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(startOfWeek);
		d.setDate(startOfWeek.getDate() + i);
		const year = d.getFullYear();
		const month = d.getMonth() + 1;
		const day = d.getDate();
		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	});
}

export function getWeekDateRange(offset: number) {
	const weekDates = getWeekDates(offset);
	const today = new Date();

	return {
		weekDates,
		startDate:
			weekDates[0] ??
			`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
		endDate:
			weekDates[weekDates.length - 1] ??
			`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
	};
}

export function normalizeShiftType(shiftId: string | null): ShiftType {
	switch (shiftId) {
		case "morning":
		case "evening":
		case "night":
			return shiftId;
		default:
			return "off";
	}
}

export function scheduleRowsToShifts(rows: ScheduleRow[]) {
	return rows.map((schedule) => ({
		id: schedule.id,
		employeeId: schedule.nurse.id,
		employeeName: schedule.nurse.name,
		date: schedule.date,
		shiftType: normalizeShiftType(schedule.shift?.id ?? null),
	}));
}

export function getNursesFromScheduleRows(rows: ScheduleRow[]) {
	const nurses = new Map<string, { id: string; name: string }>();

	for (const row of rows) {
		nurses.set(row.nurse.id, row.nurse);
	}

	return Array.from(nurses.values()).sort((a, b) =>
		a.name.localeCompare(b.name),
	);
}

export function buildShiftKey(nurseName: string, date: Date | string): string {
	let dateStr: string;
	if (typeof date === "string") {
		dateStr = date;
	} else {
		// Use local date methods to avoid timezone issues
		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}
	return `${nurseName}-${dateStr}`;
}
