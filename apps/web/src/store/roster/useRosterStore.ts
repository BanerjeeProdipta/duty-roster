import { create } from "zustand";
import type {
	SchedulesResponse,
	ShiftCounts,
	ShiftType,
} from "@/features/dashboard/roster-table/RosterMatrix.types";

interface RosterState {
	initialSchedules: SchedulesResponse | null;
	nurseRows: SchedulesResponse["nurseRows"];
	dailyShiftCounts: Record<string, ShiftCounts>;
	setInitialSchedules: (schedules: SchedulesResponse) => void;
	updateAssignment: (
		nurseId: string,
		dateKey: string,
		shiftType: ShiftType,
		previousShiftType?: ShiftType,
	) => void;
}

const emptyCounts: ShiftCounts = {
	morning: 0,
	evening: 0,
	night: 0,
	total: 0,
};

const updateCounts = (
	counts: ShiftCounts,
	shiftType: ShiftType,
	delta: number,
): ShiftCounts => {
	if (shiftType === "off") return counts;
	const key = shiftType as keyof Omit<ShiftCounts, "total">;
	return {
		...counts,
		[key]: counts[key] + delta,
		total: counts.total + delta,
	};
};

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
	updateAssignment: (nurseId, dateKey, shiftType, previousShiftType) =>
		set((state) => {
			const rowIndex = state.nurseRows.findIndex((r) => r.nurse.id === nurseId);
			if (rowIndex === -1) return state;

			const row = state.nurseRows[rowIndex];
			const existing = row.assignments[dateKey];

			const prev = previousShiftType || "off";

			const updatedRows = [...state.nurseRows];
			const updatedMetrics: ShiftCounts = {
				morning:
					row.assignedShiftMetrics.morning +
					(prev === "morning" ? -1 : 0) +
					(shiftType === "morning" ? 1 : 0),
				evening:
					row.assignedShiftMetrics.evening +
					(prev === "evening" ? -1 : 0) +
					(shiftType === "evening" ? 1 : 0),
				night:
					row.assignedShiftMetrics.night +
					(prev === "night" ? -1 : 0) +
					(shiftType === "night" ? 1 : 0),
				total:
					row.assignedShiftMetrics.total +
					(prev === "off" ? -1 : 0) +
					(shiftType === "off" ? -1 : 1),
			};

			updatedRows[rowIndex] = {
				...row,
				assignments: {
					...row.assignments,
					[dateKey]: existing
						? { ...existing, shiftType }
						: { id: `new_${dateKey}_${nurseId}`, shiftType },
				},
				assignedShiftMetrics: updatedMetrics,
			};

			const currentCounts = state.dailyShiftCounts[dateKey] || emptyCounts;
			const updatedCounts = {
				...state.dailyShiftCounts,
				[dateKey]: updateCounts(
					updateCounts(currentCounts, prev, -1),
					shiftType,
					1,
				),
			};

			return { nurseRows: updatedRows, dailyShiftCounts: updatedCounts };
		}),
}));
