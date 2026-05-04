import type { NurseState, PreferenceUpdate } from "../types";

export function convertToPreferences(
	nurse: Pick<
		NurseState,
		"nurseId" | "morning" | "evening" | "night" | "off" | "active"
	>,
	totalDays: number,
): PreferenceUpdate[] {
	const workingDays = nurse.morning + nurse.evening + nurse.night;
	const _offDays = totalDays - workingDays;

	return [
		{
			nurseId: nurse.nurseId,
			shiftId: "shift_morning",
			weight: Math.round((nurse.morning / totalDays) * 100),
			active: nurse.active,
		},
		{
			nurseId: nurse.nurseId,
			shiftId: "shift_evening",
			weight: Math.round((nurse.evening / totalDays) * 100),
			active: nurse.active,
		},
		{
			nurseId: nurse.nurseId,
			shiftId: "shift_night",
			weight: Math.round((nurse.night / totalDays) * 100),
			active: nurse.active,
		},
	];
}

export function nurseHasChanged(a: NurseState, b: NurseState): boolean {
	return (
		a.morning !== b.morning ||
		a.evening !== b.evening ||
		a.night !== b.night ||
		a.active !== b.active
	);
}
