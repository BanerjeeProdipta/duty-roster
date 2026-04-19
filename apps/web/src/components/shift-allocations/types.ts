import type { NurseShiftPreference } from "@Duty-Roster/api";

export type NurseData = Required<NurseShiftPreference>;

export type NurseState = {
	id: string;
	name: string;
	morning: number;
	evening: number;
	night: number;
	off: number;
	active: boolean;
};
