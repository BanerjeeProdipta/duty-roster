import { useCallback, useMemo, useState } from "react";
import { getMonthDates, getMonthName } from "@/utils";
import type {
	Shift,
	ShiftType,
} from "../components/roster-table/roster-matrix.types";

type MonthState = {
	year: number;
	month: number;
};

export const useRosterHeader = () => {
	const [selectedMonth, setSelectedMonth] = useState<MonthState>({
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
	});

	const [nurses, setNurses] = useState<{ id: string; name: string }[]>([]);
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [preferences, setPreferences] = useState<
		Record<string, { morning: number; evening: number; night: number }>
	>({});
	const [editable, setEditable] = useState(false);

	const updateShift = useCallback(
		(nurseName: string, dateStr: string, newType: ShiftType) => {
			setShifts((prev) =>
				prev.map((s) =>
					s.employeeName === nurseName && s.date === dateStr
						? { ...s, shiftType: newType }
						: s,
				),
			);
		},
		[],
	);

	const goToPreviousMonth = useCallback(() => {
		setSelectedMonth((state) =>
			state.month === 1
				? { year: state.year - 1, month: 12 }
				: { year: state.year, month: state.month - 1 },
		);
	}, []);

	const goToNextMonth = useCallback(() => {
		setSelectedMonth((state) =>
			state.month === 12
				? { year: state.year + 1, month: 1 }
				: { year: state.year, month: state.month + 1 },
		);
	}, []);

	const goToCurrentMonth = useCallback(() => {
		setSelectedMonth({
			year: new Date().getFullYear(),
			month: new Date().getMonth() + 1,
		});
	}, []);

	const changeMonth = useCallback((year: number, month: number) => {
		setSelectedMonth({ year, month });
	}, []);

	const monthName = useMemo(
		() => getMonthName(selectedMonth.year, selectedMonth.month),
		[selectedMonth],
	);

	const monthDates = useMemo(
		() => getMonthDates(selectedMonth.year, selectedMonth.month),
		[selectedMonth],
	);

	const monthOptions = useMemo(
		() =>
			Array.from({ length: 12 }, (_, i) => ({
				month: i + 1,
				year: selectedMonth.year,
				label: getMonthName(selectedMonth.year, i + 1),
			})),
		[selectedMonth.year],
	);

	return {
		// state
		selectedMonth,
		nurses,
		shifts,
		preferences,
		editable,

		// derived
		monthName,
		monthDates,
		monthOptions,

		// actions
		setNurses,
		setShifts,
		setPreferences,
		setEditable,
		updateShift,
		goToPreviousMonth,
		goToNextMonth,
		goToCurrentMonth,
		changeMonth,
	};
};
