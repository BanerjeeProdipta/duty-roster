"use client";

import { FileText } from "lucide-react";
import { MonthNavigator } from "@/components/MonthNavigator";
import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import {
	PAGE_HEIGHT,
	PAGE_PADDING,
	PAGE_WIDTH,
	PRINT_STYLES,
} from "../constants";
import { useRosterPageData } from "../hooks/useRosterPageData";
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

	const previewPages = hasContent
		? pageChunks.map((chunk, idx) => {
				const pageKey = chunk[0]?.Name ?? `page-${idx}`;
				return (
					<div
						key={`preview-${pageKey}`}
						className="mx-auto flex-shrink-0 bg-white shadow-lg"
						style={{
							width: PAGE_WIDTH,
							height: PAGE_HEIGHT,
							padding: PAGE_PADDING,
							boxSizing: "border-box",
						}}
					>
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

			{/* Controls */}
			<div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 lg:flex-row">
				{hasContent && totalNurses > 0 && (
					<div className="py-3 text-slate-500 text-sm">
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
						<button
							type="button"
							disabled={isFetching || !hasContent}
							className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 font-medium text-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
						>
							<FileText
								className={`h-4 w-4 ${isFetching ? "animate-pulse" : ""}`}
							/>
							{isFetching ? "Loading..." : "Roster Ready"}
						</button>

						{hasContent && (
							<button
								type="button"
								onClick={handlePrint}
								className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-800 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-slate-700"
							>
								🖨️ Print / Save as PDF
							</button>
						)}
					</div>
					<MonthNavigator />
				</div>
			</div>

			{error && <p className="text-red-600 text-sm">{error}</p>}

			{/* Screen Preview */}
			{hasContent && (
				<div>
					<div className="max-h-[calc(100vh-100px)] space-y-6 overflow-auto rounded-lg bg-slate-100 p-4">
						{previewPages}
					</div>
				</div>
			)}

			{/* Print-only content */}
			{hasContent && <div id="roster-print-root">{printPages}</div>}
		</>
	);
}
