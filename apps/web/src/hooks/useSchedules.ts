"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";
import { useYearMonth } from "./useYearMonth";

export function useSchedules(initialData?: SchedulesResponse) {
	const { year, month } = useYearMonth();

	const query = useQuery({
		queryKey: QUERY_KEYS.schedules(year, month),
		queryFn: async () => {
			const mm = String(month).padStart(2, "0");
			const lastDay = new Date(year, month, 0).getDate();
			return trpcClient.roster.getSchedules.query({
				startDate: `${year}-${mm}-01`,
				endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
			});
		},
		initialData,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		placeholderData: keepPreviousData,
	});

	return {
		schedules: query.data,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		totalDays: new Date(year, month, 0).getDate(),
		year,
		month,
	};
}
