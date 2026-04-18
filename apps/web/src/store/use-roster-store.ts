import { create } from "zustand";
import type {
	Shift,
	ShiftType,
} from "../components/roster-table/roster-matrix.types";
import {
	getMonthDates,
	getMonthName,
} from "../components/roster-table/roster-matrix.utils";

type MonthState = {
	year: number;
	month: number;
};

type RosterStore = {
	// State
	selectedMonth: MonthState;
	nurses: { id: string; name: string }[];
	shifts: Shift[];
	preferences: Record<
		string,
		{ morning: number; evening: number; night: number }
	>;
	editable: boolean;

	// Actions
	setSelectedMonth: (month: MonthState) => void;
	setNurses: (nurses: { id: string; name: string }[]) => void;
	setShifts: (shifts: Shift[] | ((prev: Shift[]) => Shift[])) => void;
	setPreferences: (
		prefs: Record<string, { morning: number; evening: number; night: number }>,
	) => void;
	setEditable: (editable: boolean) => void;
	updateShift: (nurseName: string, date: string, newType: ShiftType) => void;

	// Navigation
	goToPreviousMonth: () => void;
	goToNextMonth: () => void;
	goToCurrentMonth: () => void;
	changeMonth: (year: number, month: number) => void;
};

export const useRosterStore = create<RosterStore>((set) => ({
	selectedMonth: {
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	},
	nurses: [],
	shifts: [],
	preferences: {},
	editable: false,

	setSelectedMonth: (month) => set({ selectedMonth: month }),
	setNurses: (nurses) => set({ nurses }),
	setShifts: (shifts) =>
		set((state) => ({
			shifts: typeof shifts === "function" ? shifts(state.shifts) : shifts,
		})),
	setPreferences: (preferences) => set({ preferences }),
	setEditable: (editable) => set({ editable }),

	updateShift: (nurseName, dateStr, newType) =>
		set((state) => ({
			shifts: state.shifts.map((s) =>
				s.employeeName === nurseName && s.date === dateStr
					? { ...s, shiftType: newType }
					: s,
			),
		})),

	goToPreviousMonth: () =>
		set((state) => {
			const { year, month } = state.selectedMonth;
			return {
				selectedMonth:
					month === 1
						? { year: year - 1, month: 12 }
						: { year, month: month - 1 },
			};
		}),

	goToNextMonth: () =>
		set((state) => {
			const { year, month } = state.selectedMonth;
			return {
				selectedMonth:
					month === 12
						? { year: year + 1, month: 1 }
						: { year, month: month + 1 },
			};
		}),

	goToCurrentMonth: () =>
		set({
			selectedMonth: {
				year: new Date().getFullYear(),
				month: new Date().getMonth() + 1,
			},
		}),

	changeMonth: (year, month) =>
		set({
			selectedMonth: { year, month },
		}),
}));

export const useRosterDates = () => {
	const selectedMonth = useRosterStore((s) => s.selectedMonth);
	return getMonthDates(selectedMonth.year, selectedMonth.month);
};

export const useRosterMonthName = () => {
	const selectedMonth = useRosterStore((s) => s.selectedMonth);
	return getMonthName(selectedMonth.year, selectedMonth.month);
};
