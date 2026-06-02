"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useShiftAllocations } from "@/features/shift-manager/hooks/useShiftAllocations";
import { useSchedules } from "./useSchedules";

export function useScheduleInit(initialSchedules?: SchedulesResponse | null) {
	const {
		schedules,
		isLoading,
		isFetching,
		totalDays,
		year,
		month,
		page,
		pageSize,
		pagination,
		setPage,
		setPageSize,
	} = useSchedules(initialSchedules);
	const { nurses } = useShiftAllocations(schedules, totalDays);

	return {
		schedules,
		nurseRows: schedules?.nurseRows ?? [],
		isLoading,
		isFetching,
		totalDays,
		year,
		month,
		nurses,
		page,
		pageSize,
		pagination,
		setPage,
		setPageSize,
	};
}
