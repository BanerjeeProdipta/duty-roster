import { create } from "zustand";
import type { SchedulesResponse } from "../../components/roster-table/RosterMatrix.types";

interface RosterState {
	initialSchedules: SchedulesResponse | null;
	setInitialSchedules: (schedules: SchedulesResponse) => void;
}

export const useRosterStore = create<RosterState>((set) => ({
	initialSchedules: null,
	setInitialSchedules: (schedules) => set({ initialSchedules: schedules }),
}));
