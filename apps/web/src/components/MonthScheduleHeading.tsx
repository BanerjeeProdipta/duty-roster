"use client";

import { usePathname } from "next/navigation";
import { useYearMonth } from "@/hooks/useYearMonth";
import { getMonthOnlyName } from "@/utils";

const ROUTES_WITH_HEADING = ["/", "/dashboard", "/roster", "/manage-users"];

export function MonthScheduleHeading() {
	const pathname = usePathname();
	const { year, month } = useYearMonth();

	if (!ROUTES_WITH_HEADING.includes(pathname)) {
		return null;
	}

	return (
		<h1 className="mb-4 font-semibold text-2xl text-gray-900">
			{getMonthOnlyName(year, month)}'s Schedule
		</h1>
	);
}
