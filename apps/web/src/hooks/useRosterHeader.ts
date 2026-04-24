import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { getMonthDates, getMonthName } from "@/utils";
import { useYearMonth } from "./useYearMonth";

export const useRosterHeader = () => {
	const router = useRouter();
	const { year, month } = useYearMonth();

	const selectedMonth = { year, month };

	const updateUrl = useCallback(
		(y: number, m: number) => {
			const params = new URLSearchParams();
			params.set("year", y.toString());
			params.set("month", m.toString());
			router.push(`?${params.toString()}`);
		},
		[router],
	);

	const goToPreviousMonth = useCallback(() => {
		const newMonth = selectedMonth.month === 1 ? 12 : selectedMonth.month - 1;
		const newYear =
			selectedMonth.month === 1 ? selectedMonth.year - 1 : selectedMonth.year;
		updateUrl(newYear, newMonth);
	}, [selectedMonth, updateUrl]);

	const goToNextMonth = useCallback(() => {
		const newMonth = selectedMonth.month === 12 ? 1 : selectedMonth.month + 1;
		const newYear =
			selectedMonth.month === 12 ? selectedMonth.year + 1 : selectedMonth.year;
		updateUrl(newYear, newMonth);
	}, [selectedMonth, updateUrl]);

	const goToCurrentMonth = useCallback(() => {
		const now = new Date();
		updateUrl(now.getFullYear(), now.getMonth() + 1);
	}, [updateUrl]);

	const changeMonth = useCallback(
		(year: number, month: number) => {
			updateUrl(year, month);
		},
		[updateUrl],
	);

	const monthName = useMemo(
		() => getMonthName(selectedMonth.year, selectedMonth.month),
		[selectedMonth],
	);

	const monthDates = useMemo(
		() => getMonthDates(selectedMonth.year, selectedMonth.month),
		[selectedMonth],
	);

	const monthOptions = useMemo(() => {
		// Show 6 months before and after the current selection
		const options = [];
		const start = new Date(selectedMonth.year, selectedMonth.month - 1);
		for (let i = -6; i <= 6; i++) {
			const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
			options.push({
				month: d.getMonth() + 1,
				year: d.getFullYear(),
				label: getMonthName(d.getFullYear(), d.getMonth() + 1),
			});
		}
		return options;
	}, [selectedMonth]);

	return {
		selectedMonth,
		monthName,
		monthDates,
		monthOptions,
		goToPreviousMonth,
		goToNextMonth,
		goToCurrentMonth,
		changeMonth,
	};
};
