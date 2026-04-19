export type ShiftType = "morning" | "evening" | "night" | "off";

export interface Nurse {
	id: string;
	name: string;
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
	totalAssigned: number;
};

export type SchedulesResponse = {
	nurseRows: {
		nurse: {
			id: string;
			name: string;
		};
		shifts: ShiftCounts;
		assignments: Record<string, { id: string; shiftType: ShiftType } | null>;
		preference?: {
			morning?: number;
			evening?: number;
			night?: number;
		};
	}[];
	dailyShiftCounts: Record<string, ShiftCounts>;
};

export type ShiftPreferences = {
	nurseId: string;
	name: string;
	morning?: number | undefined;
	evening?: number | undefined;
	night?: number | undefined;
};
