import type { ShiftType } from "./roster-matrix.types";

export const STORAGE_KEY = "roster-shifts";
export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export type ScheduleRow = {
	id: string;
	date: Date;
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

export function getWeekDates(offset: number): Date[] {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const startOfWeek = new Date(today);
	startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
	startOfWeek.setHours(0, 0, 0, 0);

	return Array.from({ length: 7 }, (_, i) => {
		const d = new Date(startOfWeek);
		d.setDate(startOfWeek.getDate() + i);
		d.setHours(0, 0, 0, 0);
		return d;
	});
}

export function getWeekDateRange(offset: number) {
	const weekDates = getWeekDates(offset);

	return {
		weekDates,
		startDate: weekDates[0]?.toISOString() ?? new Date().toISOString(),
		endDate:
			weekDates[weekDates.length - 1]?.toISOString() ??
			new Date().toISOString(),
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
		date: new Date(schedule.date).toISOString().split("T")[0] ?? "",
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
	const dateStr =
		typeof date === "string" ? date : date.toISOString().split("T")[0];
	return `${nurseName}-${dateStr}`;
}

// Default shift pattern - more balanced rotation
export const DEFAULT_SHIFTS: Record<number, ShiftType> = {
	// Monday: 10 morning, 5 evening, 3 night, 12 off
	0: "morning",
	1: "morning",
	2: "morning",
	3: "morning",
	4: "morning",
	5: "morning",
	6: "morning",
	7: "morning",
	8: "morning",
	9: "morning",
	10: "evening",
	11: "evening",
	12: "evening",
	13: "evening",
	14: "evening",
	15: "night",
	16: "night",
	17: "night",
	18: "off",
	19: "off",
	20: "off",
	21: "off",
	22: "off",
	23: "off",
	24: "off",
	25: "off",
	26: "off",
	27: "off",
	28: "off",
	29: "off",
};
