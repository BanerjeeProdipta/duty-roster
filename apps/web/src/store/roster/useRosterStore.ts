import { create } from "zustand";
import type { SchedulesResponse } from "../../components/roster-table/RosterMatrix.types";

interface RosterState {
	initialSchedules: SchedulesResponse | null;
	nurseRows: SchedulesResponse["nurseRows"];
	dailyShiftCounts: SchedulesResponse["dailyShiftCounts"];
	setInitialSchedules: (schedules: SchedulesResponse) => void;
}

export const useRosterStore = create<RosterState>((set) => ({
	initialSchedules: null,
	nurseRows: [],
	dailyShiftCounts: {},
	setInitialSchedules: (schedules) =>
		set({
			initialSchedules: schedules,
			nurseRows: schedules.nurseRows ?? [],
			dailyShiftCounts: schedules.dailyShiftCounts ?? {},
		}),
}));
