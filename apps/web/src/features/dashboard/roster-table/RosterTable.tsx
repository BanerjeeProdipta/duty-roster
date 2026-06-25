"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { Pagination } from "@Duty-Roster/ui/components/pagination";
import { cn } from "@Duty-Roster/ui/lib/utils";
import { useMutationState } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBatchUpdateShifts } from "@/hooks/useBatchUpdateShifts";
import { useRosterDates } from "@/hooks/useRosterDates";
import { useSchedules } from "@/hooks/useSchedules";
import { DayHeaderCell } from "./DayHeaderCell";
import { LAYOUT } from "./Layout";
import { NurseIdentityCell } from "./NurseIdentityCell";
import type { ShiftType } from "./RosterMatrix.types";
import { RosterTableSkeleton } from "./RosterTableSkeleton";
import { SelectionPopover } from "./SelectionPopover";
import { ShiftCellBadge } from "./ShiftCellBadge";

interface RosterTableProps {
	editable?: boolean;
	initialSchedules?: SchedulesResponse;
}

function useRosterTableData(initialSchedules?: SchedulesResponse) {
	const searchParams = useSearchParams();
	const searchQuery = searchParams.get("q") || undefined;
	const { schedules, isLoading, page, pageSize, setPage, setPageSize } =
		useSchedules(initialSchedules, { searchQuery });
	return { schedules, isLoading, page, pageSize, setPage, setPageSize };
}

const DRAG_THRESHOLD = 4;

export function RosterTable({
	editable = false,
	initialSchedules,
}: RosterTableProps) {
	const { schedules, isLoading, page, pageSize, setPage, setPageSize } =
		useRosterTableData(initialSchedules);

	const generatingState = useMutationState({
		filters: { mutationKey: ["generate-roster"], status: "pending" },
		select: (mutation) => mutation.state.status,
	});
	const isGenerating = generatingState.length > 0;

	const { normalizedDates } = useRosterDates();

	const parentRef = useRef<HTMLDivElement>(null);

	const nurseRows = schedules?.nurseRows ?? [];
	const dailyShiftCounts = schedules?.dailyShiftCounts ?? {};

	const totalPages = schedules?.pagination?.totalPages ?? 1;

	const rowVirtualizer = useVirtualizer({
		count: nurseRows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => LAYOUT.rowHeight,
		overscan: 5,
	});

	const virtualRows = rowVirtualizer.getVirtualItems();

	const columnVirtualizer = useVirtualizer({
		count: normalizedDates.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => LAYOUT.cellWidth,
		horizontal: true,
		overscan: 2,
	});

	const columnVirtualItems = columnVirtualizer.getVirtualItems();
	const colTotalSize = columnVirtualizer.getTotalSize();
	const colLeftSpacer = columnVirtualItems[0]?.start ?? 0;
	const colRightSpacer =
		columnVirtualItems.length > 0
			? Math.max(0, colTotalSize - (columnVirtualItems.at(-1)?.end ?? 0))
			: colTotalSize;

	// ── Row-only selection state ──

	const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);
	const [selectedColRange, setSelectedColRange] = useState<
		[number, number] | null
	>(null);
	const [showPopover, setShowPopover] = useState(false);

	const isDraggingRef = useRef(false);
	const dragRowRef = useRef<number | null>(null);
	const dragAnchorColRef = useRef<number | null>(null);
	const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

	const batchMutation = useBatchUpdateShifts();
	const hasSelection = selectedRowIdx !== null && selectedColRange !== null;

	// Derived selected set for visual highlight
	const selectedDateKeys = useMemo(() => {
		if (!hasSelection) return new Set<string>();
		const [minCol, maxCol] = selectedColRange;
		const row = nurseRows[selectedRowIdx];
		if (!row) return new Set<string>();
		const keys = new Set<string>();
		for (let c = minCol; c <= maxCol; c++) {
			const dateKey = normalizedDates[c]?.dateStr;
			if (dateKey) keys.add(`${row.nurse.id}:${dateKey}`);
		}
		return keys;
	}, [
		hasSelection,
		selectedRowIdx,
		selectedColRange,
		nurseRows,
		normalizedDates,
	]);

	const clearSelection = useCallback(() => {
		setSelectedRowIdx(null);
		setSelectedColRange(null);
		setShowPopover(false);
		isDraggingRef.current = false;
		dragRowRef.current = null;
		dragAnchorColRef.current = null;
		pointerStartRef.current = null;
	}, []);

	const handlePopoverSelect = useCallback(
		(value: ShiftType) => {
			if (selectedRowIdx === null || selectedColRange === null) return;

			const row = nurseRows[selectedRowIdx];
			if (!row) return;

			const [minCol, maxCol] = selectedColRange;
			const items: {
				id: string;
				shiftId: string | null;
				nurseId: string;
				dateKey: string;
			}[] = [];

			for (let c = minCol; c <= maxCol; c++) {
				const dateKey = normalizedDates[c]?.dateStr;
				if (!dateKey) continue;
				const assignment = row.assignments[dateKey];
				items.push({
					id: assignment?.id || "new",
					shiftId: value === "off" ? null : `shift_${value}`,
					nurseId: row.nurse.id,
					dateKey,
				});
			}

			if (items.length === 0) return;
			batchMutation.mutate(items);
			clearSelection();
		},
		[
			selectedRowIdx,
			selectedColRange,
			nurseRows,
			normalizedDates,
			batchMutation,
			clearSelection,
		],
	);

	// ── Pointer event delegation ──

	useEffect(() => {
		const el = parentRef.current;
		if (!el) return;

		const handlePointerDown = (e: PointerEvent) => {
			const td = (e.target as HTMLElement).closest(
				"[data-cell-idx]",
			) as HTMLElement | null;
			if (!td) {
				clearSelection();
				return;
			}

			const rowIdx = Number(td.getAttribute("data-row-idx"));
			const colIdx = Number(td.getAttribute("data-col-idx"));

			if (Number.isNaN(rowIdx) || Number.isNaN(colIdx)) {
				clearSelection();
				return;
			}

			// Lock to this row
			dragRowRef.current = rowIdx;
			dragAnchorColRef.current = colIdx;
			setSelectedRowIdx(rowIdx);
			setSelectedColRange([colIdx, colIdx]);
			isDraggingRef.current = false;
			pointerStartRef.current = { x: e.clientX, y: e.clientY };

			el.setPointerCapture(e.pointerId);
		};

		const handlePointerMove = (e: PointerEvent) => {
			if (dragRowRef.current === null) return;

			if (!isDraggingRef.current) {
				const start = pointerStartRef.current;
				if (!start) return;
				const dx = Math.abs(e.clientX - start.x);
				const dy = Math.abs(e.clientY - start.y);
				if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;
				isDraggingRef.current = true;
			}

			const elUnder = document.elementFromPoint(e.clientX, e.clientY);
			const td = elUnder?.closest("[data-cell-idx]") as HTMLElement | null;
			if (!td) return;

			const rowIdx = Number(td.getAttribute("data-row-idx"));
			const colIdx = Number(td.getAttribute("data-col-idx"));
			if (Number.isNaN(rowIdx) || Number.isNaN(colIdx)) return;

			// Ignore if moved to a different row
			if (rowIdx !== dragRowRef.current) return;

			const anchorCol = dragAnchorColRef.current ?? colIdx;
			const minCol = Math.min(anchorCol, colIdx);
			const maxCol = Math.max(anchorCol, colIdx);
			setSelectedColRange([minCol, maxCol]);
		};

		const handlePointerUp = () => {
			if (dragRowRef.current !== null && editable) {
				setShowPopover(true);
			}
			isDraggingRef.current = false;
		};

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				clearSelection();
			}
		};

		el.addEventListener("pointerdown", handlePointerDown);
		el.addEventListener("pointermove", handlePointerMove);
		el.addEventListener("pointerup", handlePointerUp);
		window.addEventListener("keydown", handleKeyDown);

		return () => {
			el.removeEventListener("pointerdown", handlePointerDown);
			el.removeEventListener("pointermove", handlePointerMove);
			el.removeEventListener("pointerup", handlePointerUp);
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [clearSelection, editable]);

	// ── Popover data ──

	const popoverInfo = useMemo(() => {
		if (!showPopover || selectedRowIdx === null || selectedColRange === null)
			return null;

		const row = nurseRows[selectedRowIdx];
		if (!row) return null;

		const [minCol, maxCol] = selectedColRange;
		const startDate = normalizedDates[minCol]?.dateStr ?? "";
		const endDate = normalizedDates[maxCol]?.dateStr ?? "";

		return {
			nurseName: row.nurse.name,
			startDate,
			endDate,
		};
	}, [
		showPopover,
		selectedRowIdx,
		selectedColRange,
		nurseRows,
		normalizedDates,
	]);

	// ── Render ──

	if ((isLoading || isGenerating) && !schedules?.nurseRows?.length) {
		return <RosterTableSkeleton />;
	}

	if (!nurseRows?.length) {
		return <div className="p-4 text-gray-500">No schedules found</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="relative flex h-[calc(100vh-140px)] flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
				<div
					ref={parentRef}
					className="scrollbar-hide min-h-0 flex-1 overflow-auto"
				>
					<table
						data-testid="roster-table"
						className={cn(
							"w-full table-fixed border-separate border-spacing-0",
							hasSelection && "select-none",
						)}
					>
						<thead>
							<tr>
								<th
									className="sticky top-0 left-0 z-[30] border-r border-b bg-gray-50 px-3 py-3 text-center text-gray-600 text-sm uppercase tracking-widest"
									style={{
										width: LAYOUT.nameColWidth,
										height: LAYOUT.headerHeight,
									}}
								>
									Nurses
								</th>
								{colLeftSpacer > 0 && (
									<th
										className="border-0 p-0"
										style={{
											width: colLeftSpacer,
											height: LAYOUT.headerHeight,
										}}
									/>
								)}
								{columnVirtualItems.map((vc) => {
									const date = normalizedDates[vc.index];
									return (
										<th
											key={date.key}
											className="sticky top-0 z-[10] bg-muted"
											style={{
												width: LAYOUT.cellWidth,
												height: LAYOUT.headerHeight,
											}}
										>
											<DayHeaderCell
												date={date}
												counts={dailyShiftCounts[date.dateStr]}
											/>
										</th>
									);
								})}
								{colRightSpacer > 0 && (
									<th
										className="border-0 p-0"
										style={{
											width: colRightSpacer,
											height: LAYOUT.headerHeight,
										}}
									/>
								)}
							</tr>
						</thead>
						<tbody>
							<tr
								style={{
									height: `${virtualRows[0]?.start ?? 0}px`,
								}}
							/>
							{virtualRows.map((virtualRow) => {
								const {
									nurse,
									assignments,
									preferenceWiseShiftMetrics,
									assignedShiftMetrics,
								} = nurseRows[virtualRow.index];
								return (
									<tr
										key={virtualRow.key}
										data-index={virtualRow.index}
										ref={rowVirtualizer.measureElement}
										style={{
											height: `${virtualRow.size}px`,
										}}
									>
										<td
											className="sticky left-0 z-20 border-gray-200 border-r border-b bg-white"
											style={{
												width: LAYOUT.nameColWidth,
												minWidth: LAYOUT.nameColWidth,
												height: LAYOUT.rowHeight,
											}}
										>
											<NurseIdentityCell
												nurse={nurse}
												counts={assignedShiftMetrics}
												pref={preferenceWiseShiftMetrics}
												editable={editable}
											/>
										</td>
										{colLeftSpacer > 0 && (
											<td
												className="border-0 p-0"
												style={{ width: colLeftSpacer }}
											/>
										)}
										{columnVirtualItems.map((vc) => {
											const date = normalizedDates[vc.index];
											const dateKey = date.dateStr;
											const shift = assignments[dateKey];
											const cellKey = `${nurse.id}:${dateKey}`;
											const isSelected = selectedDateKeys.has(cellKey);
											return (
												<td
													key={dateKey}
													data-cell-idx
													data-row-idx={virtualRow.index}
													data-col-idx={vc.index}
													className={cn(
														"border-gray-200",
														isSelected && "bg-blue-100",
													)}
													style={{
														width: LAYOUT.cellWidth,
														height: LAYOUT.rowHeight,
													}}
												>
													<div
														className={cn(
															"flex h-full items-center justify-center border-r border-b transition-colors",
															editable && "cursor-pointer",
															isSelected && "border-blue-200 bg-blue-100",
														)}
														style={{
															width: LAYOUT.cellWidth,
															height: LAYOUT.rowHeight,
														}}
													>
														<ShiftCellBadge
															type={shift?.shiftType ?? "off"}
															nurseName={nurse?.name ?? "Nurse"}
															nurseId={nurse.id}
															date={dateKey}
															isSelected={isSelected}
														/>
													</div>
												</td>
											);
										})}
										{colRightSpacer > 0 && (
											<td
												className="border-0 p-0"
												style={{ width: colRightSpacer }}
											/>
										)}
									</tr>
								);
							})}
							<tr
								style={{
									height: `${Math.max(
										0,
										rowVirtualizer.getTotalSize() -
											(virtualRows[virtualRows.length - 1]?.end ?? 0),
									)}px`,
								}}
							/>
						</tbody>
					</table>
				</div>
				<Pagination
					page={page}
					pageSize={pageSize}
					totalPages={totalPages}
					onPageChange={setPage}
					onPageSizeChange={setPageSize}
					className="border-gray-200/60 border-t"
				/>
			</div>

			{popoverInfo && (
				<SelectionPopover
					nurseName={popoverInfo.nurseName}
					startDateStr={popoverInfo.startDate}
					endDateStr={popoverInfo.endDate}
					onSelect={handlePopoverSelect}
					onDismiss={clearSelection}
				/>
			)}
		</div>
	);
}
