"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useCallback, useMemo } from "react";
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

export function useRosterPageData(
	initialSchedules?: SchedulesResponse,
): UseRosterPageDataReturn {
	const { schedules, isFetching, year, month } =
		useScheduleInit(initialSchedules);

	const pageData = useMemo<PageData | null>(() => {
		if (!schedules?.nurseRows) return null;

		try {
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

			return { nurses: nurseRows, dates, monthName };
		} catch (err) {
			console.error("Failed to process roster data:", err);
			return null;
		}
	}, [schedules, year, month]);

	const pageChunks = useMemo<NurseRow[][]>(() => {
		if (!pageData) return [];

		const chunks: NurseRow[][] = [];
		const totalNurses = pageData.nurses.length;

		if (totalNurses === 0) {
			// Always return at least one empty chunk to show the page layout/headers
			return [[]];
		}

		for (let i = 0; i < totalNurses; i += NURSES_PER_PAGE) {
			chunks.push(pageData.nurses.slice(i, i + NURSES_PER_PAGE));
		}
		return chunks;
	}, [pageData]);

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

	const hasContent = pageData !== null;
	const totalNurses = pageData?.nurses.length ?? 0;

	return {
		pageData,
		pageChunks,
		hasContent,
		totalNurses,
		isFetching,
		error: null, // Error handling simplified as we derive data now
		handlePrint,
	};
}
