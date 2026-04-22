"use client";

import { useQuery } from "@tanstack/react-query";
import type { SchedulesResponse } from "@/components/roster-table/RosterMatrix.types";
import { getMonthDateRange } from "@/utils";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export function useRosterSchedules(
	year: number,
	month: number,
	initialSchedules: SchedulesResponse,
) {
	const { startDate, endDate } = getMonthDateRange(year, month);

	const query = useQuery({
		queryKey: QUERY_KEYS.roster(startDate, endDate),
		queryFn: () => trpcClient.roster.getSchedules.query({ startDate, endDate }),
		initialData: initialSchedules,
	});

	return query;
}
