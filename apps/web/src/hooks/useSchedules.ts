"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { trpcClient } from "@/utils/trpc";

export function useSchedules(initialData?: SchedulesResponse) {
	const searchParams = useSearchParams();

	const year =
		Number.parseInt(searchParams.get("year") ?? "", 10) ||
		new Date().getFullYear();
	const month =
		Number.parseInt(searchParams.get("month") ?? "", 10) ||
		new Date().getMonth() + 1;

	const query = useQuery({
		queryKey: ["schedules", year, month],
		queryFn: async () => {
			const start = `${year}-${String(month).padStart(2, "0")}-01`;
			const lastDay = new Date(year, month, 0).getDate();
			const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
			return trpcClient.roster.getSchedules.query({
				startDate: start,
				endDate: end,
			});
		},
		initialData,
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
