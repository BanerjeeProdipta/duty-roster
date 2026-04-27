"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

/**
 * Reads `year` and `month` from URL search params,
 * falling back to the current calendar month.
 */
export function useYearMonth() {
	const searchParams = useSearchParams();

	return useMemo(() => {
		const now = new Date();
		const yearParam = searchParams.get("year");
		const monthParam = searchParams.get("month");
		return {
			year: yearParam ? Number.parseInt(yearParam, 10) : now.getFullYear(),
			month: monthParam ? Number.parseInt(monthParam, 10) : now.getMonth() + 1,
		};
	}, [searchParams]);
}
