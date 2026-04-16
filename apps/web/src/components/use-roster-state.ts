import { useEffect, useMemo, useState, useTransition } from "react";
import type { Shift, ShiftType } from "./roster-matrix.types";
import {
	buildShiftKey,
	DEFAULT_SHIFTS,
	getWeekDates,
} from "./roster-matrix.utils";

type NurseOption = {
	id: string;
	name: string;
};

function generateShifts(
	weekDates: Date[],
	nurses: NurseOption[],
	existingShifts?: Shift[],
): Shift[] {
	const shifts: Shift[] = [];
	let shiftId = 0;
	const existingMap = new Map<string, ShiftType>();

	existingShifts?.forEach((shift) => {
		existingMap.set(`${shift.employeeName}-${shift.date}`, shift.shiftType);
	});

	weekDates.forEach((_, dayIndex) => {
		const dateStr = weekDates[dayIndex].toISOString().split("T")[0];
		nurses.forEach((nurse, nurseIndex) => {
			const key = `${nurse.name}-${dateStr}`;
			const shiftType =
				existingMap.get(key) || DEFAULT_SHIFTS[nurseIndex % 30] || "off";

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
	const [weekOffset, setWeekOffset] = useState(0);
	const [isPending, startTransition] = useTransition();
	const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
	const [shifts, setShifts] = useState<Shift[]>(() =>
		generateShifts(weekDates, nurses, initialShifts),
	);

	useEffect(() => {
		setShifts((previous) => generateShifts(weekDates, nurses, previous));
	}, [nurses, weekDates]);

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

	const changeWeekOffset = (updater: (current: number) => number) => {
		startTransition(() => {
			setWeekOffset((currentOffset) => {
				const nextOffset = updater(currentOffset);
				return nextOffset;
			});
		});
	};

	return {
		weekDates,
		setShifts,
		shiftMap,
		updateShift,
		isWeekTransitioning: isPending,
		goToPreviousWeek: () => changeWeekOffset((current) => current - 1),
		goToNextWeek: () => changeWeekOffset((current) => current + 1),
		goToCurrentWeek: () => changeWeekOffset(() => 0),
	};
}
