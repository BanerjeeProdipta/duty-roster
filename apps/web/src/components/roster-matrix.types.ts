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
