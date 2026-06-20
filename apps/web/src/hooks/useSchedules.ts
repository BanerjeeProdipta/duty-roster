"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";
import { useYearMonth } from "./useYearMonth";

const DEFAULT_PAGE_SIZE = 10;

interface UseSchedulesOptions {
	disablePagination?: boolean;
	searchQuery?: string;
}

export function useSchedules(
	initialData?: SchedulesResponse | null,
	options: UseSchedulesOptions = {},
) {
	const { year, month } = useYearMonth();
	const searchParams = useSearchParams();
	const router = useRouter();

	const { disablePagination = false, searchQuery } = options;

	const page = Number(searchParams.get("page")) || 1;
	const pageSize = Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;

	const query = useQuery({
		queryKey: [
			...QUERY_KEYS.schedules(year, month),
			...(disablePagination ? [] : [page, pageSize]),
			searchQuery,
		],
		queryFn: async () => {
			const mm = String(month).padStart(2, "0");
			const lastDay = new Date(year, month, 0).getDate();
			return trpcClient.roster.getSchedules.query({
				startDate: `${year}-${mm}-01`,
				endDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
				...(disablePagination ? {} : { page, pageSize }),
				q: searchQuery,
			});
		},
		initialData,
		initialDataUpdatedAt: 0, // always treat initialData as stale → forces fetch
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		placeholderData: keepPreviousData,
	});

	const setPage = useCallback(
		(newPage: number) => {
			const params = new URLSearchParams(searchParams.toString());
			if (newPage > 1) {
				params.set("page", String(newPage));
			} else {
				params.delete("page");
			}
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	const setPageSize = useCallback(
		(newPageSize: number) => {
			const params = new URLSearchParams(searchParams.toString());
			params.delete("page"); // reset to page 1
			if (newPageSize !== DEFAULT_PAGE_SIZE) {
				params.set("pageSize", String(newPageSize));
			} else {
				params.delete("pageSize");
			}
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	const pagination = query.data?.pagination;

	return {
		schedules: query.data,
		isLoading: query.isLoading,
		isFetching: query.isFetching,
		totalDays: new Date(year, month, 0).getDate(),
		year,
		month,
		page,
		pageSize,
		pagination,
		setPage,
		setPageSize,
	};
}
