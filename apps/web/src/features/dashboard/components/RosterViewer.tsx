"use client";

import { FileText } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MonthNavigator } from "@/components/MonthNavigator";
import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import { getMonthDateRange } from "@/utils";

// Constants
const SHIFT_LETTER_MAP = {
	morning: "M",
	evening: "E",
	night: "N",
	off: "O",
} as const;

const NURSES_PER_PAGE = 15;
const PAGE_WIDTH = "297mm";
const PAGE_HEIGHT = "210mm"; // A4 landscape
const PAGE_PADDING = "5mm 7mm"; // Reduced padding to fit content better

// Types
type NurseRow = Record<string, string>;

interface DateInfo {
	dayName: string;
	date: number;
}

interface PageData {
	nurses: NurseRow[];
	dates: DateInfo[];
	monthName: string;
}

interface RosterPageProps {
	chunk: NurseRow[];
	dates: DateInfo[];
	monthName: string;
	pageIdx: number;
	totalPages: number;
}

// Helpers
const createDateArray = (startDate: Date, endDate: Date): DateInfo[] => {
	const dates: DateInfo[] = [];
	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		dates.push({
			dayName: d.toLocaleString("en-US", { weekday: "short" }),
			date: d.getDate(),
		});
	}
	return dates;
};

const getMonthInfo = (startDate: Date) => {
	const monthName = startDate.toLocaleString("en-US", {
		month: "long",
		year: "numeric",
	});
	const shortMonth = startDate.toLocaleString("en-US", { month: "short" });
	const monthIndex = new Date(`${shortMonth} 1 2024`).getMonth() + 1;
	return { monthName, monthIndex };
};

const transformToNurseRows = (
	schedules: SchedulesResponse | null | undefined,
	dates: DateInfo[],
	year: number,
	monthIndex: number,
): NurseRow[] => {
	return (schedules?.nurseRows ?? []).map((row) => {
		const rowData: Record<string, string> = { Name: row.nurse.name };
		dates.forEach((dateObj) => {
			const dateKey = `${year}-${String(monthIndex).padStart(2, "0")}-${String(dateObj.date).padStart(2, "0")}`;
			const assignment = row.assignments[dateKey];
			const shiftValue = assignment
				? (SHIFT_LETTER_MAP[
						assignment.shiftType as keyof typeof SHIFT_LETTER_MAP
					] ?? "?")
				: "O";
			rowData[`${dateObj.dayName} ${dateObj.date}`] = shiftValue;
		});
		return rowData;
	});
};

// Aggressive print styles to prevent extra pages
const PRINT_STYLES = `
  @media print {
    * { 
      visibility: hidden;
      margin: 0;
      padding: 0;
    }
    
    #roster-print-root, 
    #roster-print-root * { 
      visibility: visible;
    }
    
    #roster-print-root {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
    
    .print-page {
      page-break-after: always;
      page-break-inside: avoid;
      margin: 0;
      padding: ${PAGE_PADDING};
      width: ${PAGE_WIDTH};
      height: ${PAGE_HEIGHT};
      box-sizing: border-box;
      overflow: hidden;
      display: block;
      background: white;
    }
    
    .print-page:last-child { 
      page-break-after: avoid;
    }
    
    @page { 
      size: A4 landscape;
      margin: 0;
      padding: 0;
    }
    
    html, body { 
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
    }
    
    .roster-header {
      margin: 0;
      padding: 0;
      page-break-inside: avoid;
    }
    
    table { 
      border-collapse: collapse;
      page-break-inside: avoid;
      width: 100%;
      margin: 0;
      padding: 0;
      font-size: 11px;
    }
    
    thead { 
      display: table-header-group;
      page-break-inside: avoid;
      page-break-after: avoid;
    }
    
    tbody { 
      page-break-inside: auto;
    }
    
    tr { 
      page-break-inside: avoid;
      page-break-after: auto;
      height: 24px;
    }
    
    td, th {
      border: 0.5px solid #e5e7eb;
      padding: 1px;
      margin: 0;
      height: 24px;
    }
    
    th {
      border-color: #d1d5db;
      border-width: 1px;
      background: #d1d5db;
      font-weight: bold;
    }
    
    .roster-legend {
      page-break-inside: avoid;
      margin-top: 3mm;
      font-size: 12px;
    }
  }
  
  @media screen {
    #roster-print-root { 
      display: none !important; 
    }
  }
`;

export function RosterPDFViewer() {
	const searchParams = useSearchParams();
	const [pageData, setPageData] = useState<PageData | null>(null);
	const [error, setError] = useState<string | null>(null);

	const yearParam = searchParams.get("year");
	const monthParam = searchParams.get("month");
	const now = new Date();
	const year = yearParam ? Number.parseInt(yearParam, 10) : now.getFullYear();
	const month = monthParam
		? Number.parseInt(monthParam, 10)
		: now.getMonth() + 1;

	const { schedules, isFetching } = useScheduleInit();

	// Generate page data when schedules change
	useEffect(() => {
		if (!schedules?.nurseRows) return;

		try {
			const { startDate, endDate } = getMonthDateRange(year, month);
			const start = new Date(startDate);
			const end = new Date(endDate);

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

	// Debug print pages before printing
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

	// Pagination: only create pages as needed (no forced minimum)
	const pageChunks: NurseRow[][] = pageData
		? Array.from(
				{ length: Math.ceil(pageData.nurses.length / NURSES_PER_PAGE) },
				(_, i) =>
					pageData.nurses.slice(i * NURSES_PER_PAGE, (i + 1) * NURSES_PER_PAGE),
			)
		: [];

	const hasContent = pageData && pageChunks.length > 0;
	const totalNurses = pageData?.nurses.length ?? 0;

	const previewPages = hasContent
		? pageChunks.map((chunk, idx) => {
				const pageKey = chunk[0]?.Name ?? `page-${idx}`;
				return (
					<div
						key={`preview-${pageKey}`}
						className="mx-auto h-300 flex-shrink-0 bg-white shadow-lg"
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
				{hasContent && (
					<div className="py-3 text-slate-500 text-sm">
						{totalNurses} nurses across {pageChunks.length} page
						{pageChunks.length !== 1 ? "s" : ""}
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

			{/* Print-only content - this gets printed */}
			{hasContent && <div id="roster-print-root">{printPages}</div>}
		</>
	);
}

// Extracted table component
function RosterPage({
	chunk,
	dates,
	monthName,
	pageIdx,
	totalPages,
}: RosterPageProps) {
	return (
		<div
			className="flex h-full flex-col"
			style={{ padding: 0, height: "100%" }}
		>
			{/* Header */}
			<div
				className="roster-header relative mb-2 text-center"
				style={{ flexShrink: 0 }}
			>
				<div
					className="mb-0.5 font-bold"
					style={{
						fontFamily: "var(--font-bengali), 'Noto Sans Bengali', sans-serif",
						fontSize: "16px",
					}}
				>
					উপজেলা স্বাস্থ্য কমপ্লেক্স
				</div>
				<div
					className="mb-0.5 text-slate-600"
					style={{
						fontFamily: "var(--font-bengali), 'Noto Sans Bengali', sans-serif",
						fontSize: "11px",
					}}
				>
					নার্সেস রোস্টার — {monthName}
				</div>
				<div className="absolute top-0 right-0 text-slate-400 text-xs">
					Page {pageIdx + 1} of {totalPages}
				</div>
			</div>

			{/* Table - takes remaining space */}
			<div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
				<table
					className="border-collapse text-xs"
					style={{
						tableLayout: "fixed",
						width: "100%",
						borderSpacing: 0,
						fontSize: "11px",
					}}
				>
					<thead>
						<tr style={{ height: "24px" }}>
							<th
								className="border border-slate-400 bg-slate-300 px-1 py-1 text-left font-bold"
								style={{
									width: "50px",
									minWidth: "50px",
									fontSize: "11px",
									paddingLeft: "6px",
								}}
							>
								Name
							</th>
							{dates.map((d) => (
								<th
									key={`h-${d.date}`}
									className="border border-slate-400 bg-slate-300 text-center font-bold leading-tight"
									style={{
										width: "20px",
										minWidth: "20px",
										maxWidth: "20px",
										fontSize: "9px",
										padding: "2px 0",
										height: "24px",
									}}
								>
									<div style={{ lineHeight: "1" }}>{d.dayName}</div>
									<div style={{ lineHeight: "1" }}>{d.date}</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{chunk.map((nurse, idx) => {
							const bgClass = idx % 2 === 1 ? "bg-slate-100" : "bg-white";
							const name = nurse.Name ?? "";

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: nurse name alone is not guaranteed unique; composite key with idx is safest
								<tr key={`row-${name}-${idx}`} style={{ height: "24px" }}>
									<td
										className={`border border-slate-300 px-1 py-0.5 font-medium ${bgClass}`}
										style={{
											fontFamily:
												"var(--font-bengali), 'Noto Sans Bengali', sans-serif",
											fontSize: "13px",
											lineHeight: "1.2",
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
											maxWidth: "60px",
											height: "24px",
											paddingLeft: "6px",
										}}
									>
										{name}
									</td>
									{dates.map((d) => {
										const cellKey = `${d.dayName} ${d.date}`;
										return (
											<td
												key={`cell-${d.date}`}
												className={`border border-slate-300 text-center ${bgClass}`}
												style={{
													width: "20px",
													minWidth: "20px",
													maxWidth: "20px",
													fontSize: "11px",
													padding: "1px 0",
													height: "24px",
												}}
											>
												{nurse[cellKey] ?? ""}
											</td>
										);
									})}
								</tr>
							);
						})}

						{/* Filler rows to maintain consistent page structure */}
						{Array.from({
							length: Math.max(0, NURSES_PER_PAGE - chunk.length),
						}).map((_, fillerIdx) => {
							const fillerRowIndex = chunk.length + fillerIdx;
							const bgClass =
								fillerRowIndex % 2 === 1 ? "bg-slate-100" : "bg-white";

							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: filler rows are anonymous placeholders with no identity
								<tr key={`filler-${fillerIdx}`} style={{ height: "24px" }}>
									<td
										className={`border border-slate-300 ${bgClass}`}
										style={{ height: "24px" }}
									/>
									{dates.map((d) => (
										<td
											key={`filler-cell-${d.date}`}
											className={`border border-slate-300 ${bgClass}`}
											style={{
												width: "20px",
												maxWidth: "20px",
												height: "24px",
											}}
										/>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Legend */}
			<div
				className="roster-legend flex gap-6 text-slate-600"
				style={{ flexShrink: 0, fontSize: "12px", marginTop: "4mm" }}
			>
				<span>
					<strong>M</strong> = Morning
				</span>
				<span>
					<strong>E</strong> = Evening
				</span>
				<span>
					<strong>N</strong> = Night
				</span>
				<span>
					<strong>O</strong> = Off
				</span>
			</div>
		</div>
	);
}
