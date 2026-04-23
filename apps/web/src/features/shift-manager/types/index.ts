export interface NurseState {
	nurseId: string;
	name: string;
	morning: number;
	evening: number;
	night: number;
	off: number;
	active: boolean;
}

export interface PreferenceUpdate {
	nurseId: string;
	shiftId: string;
	weight: number;
	active: boolean;
}

export type ShiftField = "morning" | "evening" | "night" | "off";
