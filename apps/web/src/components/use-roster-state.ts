import { useEffect, useMemo, useState } from "react";
import { NURSES } from "./roster-matrix.constants";
import type { Shift, ShiftType } from "./roster-matrix.types";
import {
	buildShiftKey,
	DEFAULT_SHIFTS,
	getWeekDates,
	STORAGE_KEY,
} from "./roster-matrix.utils";

function loadFromSessionStorage(): Shift[] | null {
	if (typeof window === "undefined") return null;
	const stored = sessionStorage.getItem(STORAGE_KEY);
	return stored ? JSON.parse(stored) : null;
}

function saveToSessionStorage(shifts: Shift[]) {
	if (typeof window === "undefined") return;
	sessionStorage.setItem(STORAGE_KEY, JSON.stringify(shifts));
}

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
	const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
	const [shifts, setShifts] = useState<Shift[]>(() =>
		generateShifts(getWeekDates(0)),
	);
	const [storageHydrated, setStorageHydrated] = useState(false);

	useEffect(() => {
		const stored = loadFromSessionStorage();
		if (stored) {
			setShifts(stored);
		}
		setStorageHydrated(true);
	}, []);

	useEffect(() => {
		if (!storageHydrated) return;
		setShifts((previous) => generateShifts(weekDates, previous));
	}, [weekDates, storageHydrated]);

	const shiftMap = useMemo(() => {
		const map = new Map<string, Shift>();
		shifts.forEach((shift) => {
			map.set(buildShiftKey(shift.employeeName, shift.date), shift);
		});
		return map;
	}, [shifts]);

	const updateShift = (nurseName: string, date: Date, newType: ShiftType) => {
		const dateStr = date.toISOString().split("T")[0];
		setShifts((previous) => {
			const updated = previous.map((shift) =>
				shift.employeeName === nurseName && shift.date === dateStr
					? { ...shift, shiftType: newType }
					: shift,
			);
			saveToSessionStorage(updated);
			return updated;
		});
	};

	return { setWeekOffset, weekDates, shiftMap, updateShift };
}
