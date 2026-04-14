export type ShiftType = "morning" | "evening" | "night" | "off";

export interface Shift {
	id: string;
	employeeId: string;
	employeeName: string;
	date: string;
	shiftType: ShiftType;
}
