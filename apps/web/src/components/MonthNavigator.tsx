"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useYearMonth } from "@/hooks/useYearMonth";
import { formatMonth } from "@/utils";

export function MonthNavigator() {
	const router = useRouter();
	const { year, month } = useYearMonth();

	const monthDate = new Date(Date.UTC(year, month - 1));

	const navigateToMonth = useCallback(
		(newYear: number, newMonth: number) => {
			const params = new URLSearchParams();
			params.set("year", String(newYear));
			params.set("month", String(newMonth));
			router.push(`?${params.toString()}`);
		},
		[router],
	);

	const goToPreviousMonth = useCallback(() => {
		let newMonth = month - 1;
		let newYear = year;
		if (newMonth < 1) {
			newMonth = 12;
			newYear -= 1;
		}
		navigateToMonth(newYear, newMonth);
	}, [year, month, navigateToMonth]);

	const goToNextMonth = useCallback(() => {
		let newMonth = month + 1;
		let newYear = year;
		if (newMonth > 12) {
			newMonth = 1;
			newYear += 1;
		}
		navigateToMonth(newYear, newMonth);
	}, [year, month, navigateToMonth]);

	return (
		<div className="flex items-center justify-between gap-2 rounded-lg border">
			<Button variant="ghost" size="icon-sm" onClick={goToPreviousMonth}>
				<ArrowLeft className="h-4 w-4" />
			</Button>

			<div className="font-medium text-slate-800 text-sm">
				{formatMonth(monthDate)}
			</div>

			<Button variant="ghost" size="icon-sm" onClick={goToNextMonth}>
				<ArrowRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
