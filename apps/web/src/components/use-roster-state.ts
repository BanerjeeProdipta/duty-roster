import { useMemo, useState, useTransition } from "react";
import { NURSES } from "./roster-matrix.constants";
import type { Shift, ShiftType } from "./roster-matrix.types";
import {
	buildShiftKey,
	DEFAULT_SHIFTS,
	getWeekDates,
} from "./roster-matrix.utils";

function generateShifts(weekDates: Date[], existingShifts?: Shift[]): Shift[] {
	const shifts: Shift[] = [];
	let shiftId = 0;
	const existingMap = new Map<string, ShiftType>();

	existingShifts?.forEach((shift) => {
		existingMap.set(`${shift.employeeName}-${shift.date}`, shift.shiftType);
	});

	weekDates.forEach((_, dayIndex) => {
		const dateStr = weekDates[dayIndex].toISOString().split("T")[0];
		NURSES.forEach((nurse, nurseIndex) => {
			const key = `${nurse}-${dateStr}`;
			const shiftType =
				existingMap.get(key) || DEFAULT_SHIFTS[nurseIndex % 30] || "off";

			shifts.push({
				id: `${shiftId++}`,
				employeeId: `n${nurseIndex}`,
				employeeName: nurse,
				date: dateStr,
				shiftType,
			});
		});
	});

	return shifts;
}

export function useRosterState() {
	const [weekOffset, setWeekOffset] = useState(0);
	const [isPending, startTransition] = useTransition();
	const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
	const [shifts, setShifts] = useState<Shift[]>(() =>
		generateShifts(getWeekDates(0)),
	);

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
				setShifts((previous) =>
					generateShifts(getWeekDates(nextOffset), previous),
				);
				return nextOffset;
			});
		});
	};

	return {
		weekDates,
		shiftMap,
		updateShift,
		isWeekTransitioning: isPending,
		goToPreviousWeek: () => changeWeekOffset((current) => current - 1),
		goToNextWeek: () => changeWeekOffset((current) => current + 1),
		goToCurrentWeek: () => changeWeekOffset(() => 0),
	};
}
