import { create } from "zustand";
import type {
	SchedulesResponse,
	ShiftType,
} from "../../components/roster-table/RosterMatrix.types";

interface RosterState {
	initialSchedules: SchedulesResponse | null;
	nurseRows: SchedulesResponse["nurseRows"];
	dailyShiftCounts: SchedulesResponse["dailyShiftCounts"];
	setInitialSchedules: (schedules: SchedulesResponse) => void;
	updateAssignment: (
		nurseId: string,
		dateKey: string,
		shiftType: ShiftType,
	) => void;
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
	updateAssignment: (nurseId, dateKey, shiftType) =>
		set((state) => {
			const rowIndex = state.nurseRows.findIndex((r) => r.nurse.id === nurseId);
			if (rowIndex === -1) return state;

			const row = state.nurseRows[rowIndex];
			const assignment = row.assignments[dateKey];
			if (!assignment) return state;

			const updatedRows = [...state.nurseRows];
			updatedRows[rowIndex] = {
				...row,
				assignments: {
					...row.assignments,
					[dateKey]: { ...assignment, shiftType },
				},
			};

			return { nurseRows: updatedRows };
		}),
}));
