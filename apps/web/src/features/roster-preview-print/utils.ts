import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { SHIFT_LETTER_MAP } from "./constants";
import type { DateInfo, NurseRow } from "./types";

export const createDateArray = (startDate: Date, endDate: Date): DateInfo[] => {
	const dates: DateInfo[] = [];
	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		dates.push({
			dayName: d.toLocaleString("en-US", { weekday: "short" }),
			date: d.getDate(),
		});
	}
	return dates;
};

export const getMonthInfo = (startDate: Date) => {
	const monthName = startDate.toLocaleString("en-US", {
		month: "long",
		year: "numeric",
	});
	// getMonth() is 0-indexed, so + 1 gives the calendar month number.
	const monthIndex = startDate.getMonth() + 1;
	return { monthName, monthIndex };
};

export const transformToNurseRows = (
	schedules: SchedulesResponse | null | undefined,
	dates: DateInfo[],
	year: number,
	monthIndex: number,
): NurseRow[] => {
	return (schedules?.nurseRows ?? []).map((row) => {
		const rowData: Record<string, string> = { Name: row.nurse.name };
		dates.forEach((dateObj) => {
			const dateKey = `${year}-${String(monthIndex).padStart(2, "0")}-${String(dateObj.date).padStart(2, "0")}`;
			const assignment = row.assignments[dateKey];
			const shiftValue = assignment
				? (SHIFT_LETTER_MAP[
						assignment.shiftType as keyof typeof SHIFT_LETTER_MAP
					] ?? "?")
				: "O";
			rowData[`${dateObj.dayName} ${dateObj.date}`] = shiftValue;
		});
		return rowData;
	});
};
