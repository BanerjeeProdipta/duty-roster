import { useEffect, useMemo, useState, useTransition } from "react";
import type { Shift, ShiftType } from "./roster-matrix.types";
import {
	buildShiftKey,
	getMonthDates,
	getMonthName,
} from "./roster-matrix.utils";

type NurseOption = {
	id: string;
	name: string;
};

function generateShifts(
	dates: string[],
	nurses: NurseOption[],
	existingShifts?: Shift[],
): Shift[] {
	const shifts: Shift[] = [];
	let shiftId = 0;
	const existingMap = new Map<string, ShiftType>();

	existingShifts?.forEach((shift) => {
		existingMap.set(`${shift.employeeName}-${shift.date}`, shift.shiftType);
	});

	dates.forEach((dateStr, _dayIndex) => {
		nurses.forEach((nurse) => {
			const key = `${nurse.name}-${dateStr}`;
			const shiftType = existingMap.get(key) || "off";

			shifts.push({
				id: `${shiftId++}`,
				employeeId: nurse.id,
				employeeName: nurse.name,
				date: dateStr,
				shiftType,
			});
		});
	});

	return shifts;
}

export function useRosterState(nurses: NurseOption[], initialShifts?: Shift[]) {
	const today = new Date();
	const [selectedMonth, setSelectedMonth] = useState(() => ({
		year: today.getFullYear(),
		month: today.getMonth() + 1,
	}));
	const [isPending, startTransition] = useTransition();

	// Get all dates for the selected month
	const monthDates = useMemo(
		() => getMonthDates(selectedMonth.year, selectedMonth.month),
		[selectedMonth],
	);

	const [shifts, setShifts] = useState<Shift[]>(() =>
		generateShifts(monthDates, nurses, initialShifts),
	);

	const monthName = useMemo(
		() => getMonthName(selectedMonth.year, selectedMonth.month),
		[selectedMonth],
	);

	const monthDateRange = useMemo(() => {
		const firstDate = monthDates[0] ?? today.toISOString();
		const lastDate = monthDates[monthDates.length - 1] ?? today.toISOString();
		return { startDate: firstDate, endDate: lastDate };
	}, [monthDates, today.toISOString]);

	useEffect(() => {
		setShifts((previous) => generateShifts(monthDates, nurses, previous));
	}, [nurses, monthDates]);

	const shiftMap = useMemo(() => {
		const map = new Map<string, Shift>();
		shifts.forEach((shift) => {
			map.set(buildShiftKey(shift.employeeName, shift.date), shift);
		});
		return map;
	}, [shifts]);

	const updateShift = (nurseName: string, date: Date, newType: ShiftType) => {
		const dateStr = date.toISOString().split("T")[0];
		setShifts((previous) =>
			previous.map((shift) =>
				shift.employeeName === nurseName && shift.date === dateStr
					? { ...shift, shiftType: newType }
					: shift,
			),
		);
	};

	const goToPreviousMonth = () => {
		startTransition(() => {
			setSelectedMonth((current) => {
				if (current.month === 1) {
					return { year: current.year - 1, month: 12 };
				}
				return { ...current, month: current.month - 1 };
			});
		});
	};

	const goToNextMonth = () => {
		startTransition(() => {
			setSelectedMonth((current) => {
				if (current.month === 12) {
					return { year: current.year + 1, month: 1 };
				}
				return { ...current, month: current.month + 1 };
			});
		});
	};

	const goToCurrentMonth = () => {
		startTransition(() => {
			setSelectedMonth({
				year: today.getFullYear(),
				month: today.getMonth() + 1,
			});
		});
	};

	const changeMonth = (year: number, month: number) => {
		startTransition(() => {
			setSelectedMonth({ year, month });
		});
	};

	return {
		monthDates,
		setShifts,
		shiftMap,
		updateShift,
		isTransitioning: isPending,
		selectedMonth,
		monthName,
		monthDateRange,
		goToPreviousMonth,
		goToNextMonth,
		goToCurrentMonth,
		changeMonth,
	};
}
