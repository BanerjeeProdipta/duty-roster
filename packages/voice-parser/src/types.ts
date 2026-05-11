export type ShiftType = "morning" | "evening" | "night" | "off";

export interface NameMatch {
	bengaliName: string;
	nurseId: string;
	confidence: number;
}

export interface SetShiftCommand {
	type: "set-shift";
	nurseId: string;
	nurseName: string;
	shiftType: ShiftType;
	date: Date;
	dateKey: string;
}

export interface UnknownCommand {
	type: "unknown";
	text: string;
}

export type ParsedCommand = SetShiftCommand | UnknownCommand;

export interface NameRecord {
	id: string;
	name: string;
}
