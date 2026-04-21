"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { getMonthDates } from "@/utils";

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

export function useRosterDates() {
	const searchParams = useSearchParams();

	const monthDates = useMemo(() => {
		const y = searchParams.get("year");
		const m = searchParams.get("month");
		return getMonthDates(
			y ? Number.parseInt(y, 10) : undefined,
			m ? Number.parseInt(m, 10) : undefined,
		);
	}, [searchParams]);

	const weekDates = useMemo(
		() => monthDates.map((d) => new Date(`${d}T12:00:00Z`)),
		[monthDates],
	);

	const todayStr = useMemo(() => new Date().toDateString(), []);

	const normalizedDates = useMemo((): NormalizedDate[] => {
		return weekDates.map((date) => {
			const isToday = date.toDateString() === todayStr;
			const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });
			const dateStr = date.toISOString().split("T")[0];

			return {
				date,
				dateStr,
				time: date.getTime(),
				isToday,
				label: dayOfWeek,
				formatted: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
				shortLabel: date.toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}),
				key: date.getTime(),
			};
		});
	}, [weekDates, todayStr]);

	return { weekDates, normalizedDates, monthDates };
}
