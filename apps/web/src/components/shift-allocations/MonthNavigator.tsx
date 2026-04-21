"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { formatMonth, type MonthNavigatorProps } from "./utils";

export function MonthNavigator(_props: MonthNavigatorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const now = new Date();
	const year =
		Number.parseInt(searchParams.get("year") ?? "", 10) || now.getFullYear();
	const month =
		Number.parseInt(searchParams.get("month") ?? "", 10) || now.getMonth() + 1;

	const monthDate = useMemo(() => {
		return new Date(year, month - 1);
	}, [year, month]);

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
		<div className="flex items-center justify-between">
			<Button variant="ghost" size="icon-sm" onClick={goToPreviousMonth}>
				<ArrowLeft className="h-4 w-4" />
			</Button>

			<div className="font-semibold text-slate-800 text-sm">
				{formatMonth(monthDate)}
			</div>

			<Button variant="ghost" size="icon-sm" onClick={goToNextMonth}>
				<ArrowRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
