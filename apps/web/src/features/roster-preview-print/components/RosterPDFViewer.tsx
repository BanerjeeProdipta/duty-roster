"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MonthNavigator } from "@/components/MonthNavigator";
import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import {
	PAGE_HEIGHT,
	PAGE_PADDING,
	PAGE_WIDTH,
	PRINT_STYLES,
} from "../constants";
import { useRosterPageData } from "../hooks/useRosterPageData";
import { downloadExcel } from "../utils/downloadExcel";
import { RosterPage } from "./RosterPage";

interface RosterPDFViewerProps {
	initialSchedules?: SchedulesResponse | null;
}

export function RosterPDFViewer({ initialSchedules }: RosterPDFViewerProps) {
	const {
		pageData,
		pageChunks,
		hasContent,
		totalNurses,
		isFetching,
		error,
		handlePrint,
	} = useRosterPageData(initialSchedules ?? undefined);

	const handleDownloadExcel = useCallback(() => {
		if (!pageData) return;
		downloadExcel(pageData.nurses, pageData.dates, pageData.monthName);
	}, [pageData]);

	const INITIAL_BUFFER = 2;
	const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
	const [visiblePages, setVisiblePages] = useState<Set<number>>(
		new Set(Array.from({ length: INITIAL_BUFFER }, (_, i) => i)),
	);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const observer = new IntersectionObserver(
			(entries) => {
				setVisiblePages((prev) => {
					const next = new Set(prev);
					entries.forEach((entry) => {
						const pageId = Number(entry.target.getAttribute("data-page-id"));
						if (entry.isIntersecting) {
							next.add(pageId);
						}
					});
					return next;
				});
			},
			{ rootMargin: "200px", threshold: 0 },
		);

		pageRefs.current.forEach((element) => {
			observer.observe(element);
		});

		return () => observer.disconnect();
	}, []);

	const setPageRef = (idx: number) => (el: HTMLDivElement | null) => {
		if (el) {
			el.setAttribute("data-page-id", String(idx));
			pageRefs.current.set(idx, el);
		} else {
			pageRefs.current.delete(idx);
		}
	};

	const previewPages = hasContent
		? pageChunks.map((chunk, idx) => {
				const pageKey = chunk[0]?.Name ?? `page-${idx}`;
				const shouldRender = visiblePages.has(idx);

				return (
					<div
						key={`preview-${pageKey}`}
						ref={setPageRef(idx)}
						className="mx-auto flex-shrink-0 bg-white shadow-lg"
						style={{
							width: PAGE_WIDTH,
							height: PAGE_HEIGHT,
							padding: PAGE_PADDING,
							boxSizing: "border-box",
						}}
					>
						{shouldRender ? (
							<RosterPage
								chunk={chunk}
								dates={(pageData as NonNullable<typeof pageData>).dates}
								monthName={(pageData as NonNullable<typeof pageData>).monthName}
								pageIdx={idx}
								totalPages={pageChunks.length}
							/>
						) : (
							<div className="h-full w-full animate-pulse bg-gray-100" />
						)}
					</div>
				);
			})
		: null;

	const printPages = hasContent
		? pageChunks.map((chunk, idx) => {
				const pageKey = chunk[0]?.Name ?? `page-${idx}`;
				return (
					<div key={`print-${pageKey}`} className="print-page">
						<RosterPage
							chunk={chunk}
							dates={(pageData as NonNullable<typeof pageData>).dates}
							monthName={(pageData as NonNullable<typeof pageData>).monthName}
							pageIdx={idx}
							totalPages={pageChunks.length}
						/>
					</div>
				);
			})
		: null;

	return (
		<>
			<style>{PRINT_STYLES}</style>

			<div className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 lg:flex-row">
				{hasContent && totalNurses > 0 && (
					<div className="py-3 text-gray-500 text-sm">
						{totalNurses} nurses across {pageChunks.length} page
						{pageChunks.length !== 1 ? "s" : ""}
					</div>
				)}
				{hasContent && totalNurses === 0 && (
					<div className="py-3 font-medium text-amber-600 text-sm italic">
						No nurses assigned to this month.
					</div>
				)}
				<div className="flex flex-col items-center gap-2 lg:flex-row">
					<div className="flex flex-row items-center gap-2">
						{hasContent && (
							<button
								type="button"
								onClick={handlePrint}
								className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-800 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-gray-700"
							>
								🖨️ Print / Save as PDF
							</button>
						)}
						{hasContent && pageData && totalNurses > 0 && (
							<button
								type="button"
								onClick={handleDownloadExcel}
								className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-700 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-emerald-600"
							>
								⬇️ Download Excel
							</button>
						)}
					</div>
					<MonthNavigator />
				</div>
			</div>

			{error && <p className="text-red-600 text-sm">{error}</p>}

			{hasContent && (
				<div>
					<div className="max-h-[calc(100vh-100px)] space-y-6 overflow-auto rounded-lg bg-gray-100 p-4">
						{previewPages}
					</div>
				</div>
			)}

			{hasContent && <div id="roster-print-root">{printPages}</div>}
		</>
	);
}
