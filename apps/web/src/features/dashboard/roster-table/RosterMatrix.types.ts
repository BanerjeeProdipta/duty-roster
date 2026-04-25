export type ShiftType = "morning" | "evening" | "night" | "off";

export interface Nurse {
	id: string;
	name: string;
	active?: boolean;
}

export interface Shift {
	id: string;
	employeeId: string;
	employeeName: string;
	date: string;
	shiftType: ShiftType;
}

export type ShiftCounts = {
	morning: number;
	evening: number;
	night: number;
	total: number;
};

export type ShiftPreferences = {
	nurseId: string;
	name: string;
	morning?: number | undefined;
	evening?: number | undefined;
	night?: number | undefined;
};

export type ShiftDefinition = {
	id: string;
	name: "morning" | "evening" | "night";
	startTime: string;
	endTime: string;
	crossesMidnight: boolean;
};

export type { SchedulesResponse } from "@Duty-Roster/api";
