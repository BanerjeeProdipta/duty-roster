"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useShiftAllocations } from "@/features/shift-manager/hooks/useShiftAllocations";
import { useSchedules } from "./useSchedules";

export function useScheduleInit(initialSchedules?: SchedulesResponse) {
	const { schedules, isFetching, totalDays, year, month } =
		useSchedules(initialSchedules);
	const { nurses } = useShiftAllocations(schedules, totalDays);

	return {
		schedules,
		isFetching,
		totalDays,
		year,
		month,
		nurses,
	};
}
