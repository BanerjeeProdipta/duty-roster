"use client";

import { useSearchParams } from "next/navigation";
import { useRef } from "react";

/**
 * Reads `year` and `month` from URL search params,
 * falling back to the current calendar month.
 * Returns a stable reference that only changes when year/month actually change.
 */
export function useYearMonth() {
	const searchParams = useSearchParams();
	const ref = useRef<{ year: number; month: number } | null>(null);

	const yearParam = searchParams.get("year");
	const monthParam = searchParams.get("month");
	const now = new Date();
	const year = yearParam ? Number.parseInt(yearParam, 10) : now.getFullYear();
	const month = monthParam
		? Number.parseInt(monthParam, 10)
		: now.getMonth() + 1;

	// Only update ref if year or month actually changed
	if (
		!ref.current ||
		ref.current.year !== year ||
		ref.current.month !== month
	) {
		ref.current = { year, month };
	}

	return ref.current;
}
