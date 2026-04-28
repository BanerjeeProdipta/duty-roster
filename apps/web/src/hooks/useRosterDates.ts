"use client";

import { useMemo } from "react";
import { getMonthDates } from "@/utils";
import { useYearMonth } from "./useYearMonth";

export type NormalizedDate = {
	date: Date;
	dateStr: string;
	time: number;
	isToday: boolean;
	label: string;
	formatted: string;
	shortLabel: string;
	key: number;
};

function getUTCDayName(dayIndex: number): string {
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	return days[dayIndex];
}

function getUTCTodayStr(): string {
	const now = new Date();
	return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function useRosterDates() {
	const { year, month } = useYearMonth();

	const monthDates = useMemo(() => {
		return getMonthDates(year, month);
	}, [year, month]);

	const weekDates = useMemo(
		() => monthDates.map((d) => new Date(`${d}T12:00:00Z`)),
		[monthDates],
	);

	const todayStr = useMemo(() => getUTCTodayStr(), []);

	const normalizedDates = useMemo((): NormalizedDate[] => {
		return monthDates.map((dateStr, idx) => {
			const date = weekDates[idx];
			const isToday = dateStr === todayStr;
			const dayIndex = date.getUTCDay();
			const label = getUTCDayName(dayIndex);
			const month = date.getUTCMonth() + 1;
			const day = date.getUTCDate();

			return {
				date,
				dateStr,
				time: date.getTime(),
				isToday,
				label,
				formatted: `${month}/${day}`,
				shortLabel: `${label} ${month}/${day}`,
				key: date.getTime(),
			};
		});
	}, [monthDates, weekDates, todayStr]);

	return { weekDates, normalizedDates, monthDates };
}
