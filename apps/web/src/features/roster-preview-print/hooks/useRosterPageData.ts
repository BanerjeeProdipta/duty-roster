"use client";

import { useCallback, useEffect, useState } from "react";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import { NURSES_PER_PAGE } from "../constants";
import type { NurseRow, PageData } from "../types";
import { createDateArray, getMonthInfo, transformToNurseRows } from "../utils";

interface UseRosterPageDataReturn {
	pageData: PageData | null;
	pageChunks: NurseRow[][];
	hasContent: boolean;
	totalNurses: number;
	isFetching: boolean;
	error: string | null;
	handlePrint: () => void;
}

export function useRosterPageData(): UseRosterPageDataReturn {
	const [pageData, setPageData] = useState<PageData | null>(null);
	const [error, setError] = useState<string | null>(null);

	// year/month come from useScheduleInit (which wraps useSchedules → useYearMonth)
	// — no need to re-read search params here.
	const { schedules, isFetching, year, month } = useScheduleInit();

	useEffect(() => {
		if (!schedules?.nurseRows) return;

		try {
			// Build date range directly from year/month — no string round-trip needed.
			const start = new Date(year, month - 1, 1);
			const end = new Date(year, month, 0); // last day of month

			const dates = createDateArray(start, end);
			const { monthName, monthIndex } = getMonthInfo(start);
			const nurseRows = transformToNurseRows(
				schedules,
				dates,
				year,
				monthIndex,
			);

			setPageData({ nurses: nurseRows, dates, monthName });
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to process roster");
		}
	}, [schedules, year, month]);

	const debugPrintPages = useCallback(() => {
		const printRoot = document.getElementById("roster-print-root");
		if (!printRoot) {
			console.warn("Print root not found");
			return;
		}
		const pages = printRoot.querySelectorAll(".print-page");
		console.log(`📄 Total pages in DOM: ${pages.length}`);
		pages.forEach((page, idx) => {
			const height = (page as HTMLElement).offsetHeight;
			const table = page.querySelector("table");
			const tableHeight = table ? (table as HTMLElement).offsetHeight : 0;
			console.log(
				`Page ${idx + 1}: Container=${height}px, Table=${tableHeight}px`,
			);
		});
	}, []);

	const handlePrint = useCallback(() => {
		debugPrintPages();
		setTimeout(() => window.print(), 100);
	}, [debugPrintPages]);

	const pageChunks: NurseRow[][] = pageData
		? Array.from(
				{ length: Math.ceil(pageData.nurses.length / NURSES_PER_PAGE) },
				(_, i) =>
					pageData.nurses.slice(i * NURSES_PER_PAGE, (i + 1) * NURSES_PER_PAGE),
			)
		: [];

	const hasContent = pageData !== null && pageChunks.length > 0;
	const totalNurses = pageData?.nurses.length ?? 0;

	return {
		pageData,
		pageChunks,
		hasContent,
		totalNurses,
		isFetching,
		error,
		handlePrint,
	};
}
