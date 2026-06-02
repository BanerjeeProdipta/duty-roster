"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMutationState } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { useShifts } from "@/hooks/useGetShifts";
import { useRosterDates } from "@/hooks/useRosterDates";
import { useSchedules } from "@/hooks/useSchedules";
import { DayHeaderCell } from "./DayHeaderCell";
import { LAYOUT } from "./Layout";
import { NurseIdentityCell } from "./NurseIdentityCell";
import { RosterTableSkeleton } from "./RosterTableSkeleton";
import { ShiftBadge } from "./ShiftDropdown";

interface RosterTableProps {
	editable?: boolean;
	initialSchedules?: SchedulesResponse;
}

function useRosterTableData(initialSchedules?: SchedulesResponse) {
	const { schedules, isLoading } = useSchedules(initialSchedules);
	return { schedules, isLoading };
}

export function RosterTable({
	editable = false,
	initialSchedules,
}: RosterTableProps) {
	const { schedules, isLoading } = useRosterTableData(initialSchedules);
	const searchParams = useSearchParams();
	const qParam = searchParams.get("q") ?? "";

	const generatingState = useMutationState({
		filters: { mutationKey: ["generate-roster"], status: "pending" },
		select: (mutation) => mutation.state.status,
	});
	const isGenerating = generatingState.length > 0;

	const shifts = useShifts();
	const { normalizedDates } = useRosterDates();

	const parentRef = useRef<HTMLDivElement>(null);

	const nurseRows = qParam.trim()
		? (schedules?.nurseRows ?? []).filter((row) =>
				row.nurse.name.toLowerCase().includes(qParam.toLowerCase()),
			)
		: (schedules?.nurseRows ?? []);
	const dailyShiftCounts = schedules?.dailyShiftCounts ?? {};

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
			? Math.max(0, colTotalSize - columnVirtualItems.at(-1)!.end)
			: colTotalSize;

	if ((isLoading || isGenerating) && !schedules?.nurseRows?.length) {
		return <RosterTableSkeleton />;
	}

	if (!nurseRows?.length) {
		return <div className="p-4 text-gray-500">No schedules found</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="relative flex h-[calc(100vh-98px)] flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
				<div
					ref={parentRef}
					className="scrollbar-hide min-h-0 flex-1 overflow-auto"
				>
					<table
						data-testid="roster-table"
						className="w-full table-fixed border-separate border-spacing-0"
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
											return (
												<td
													key={dateKey}
													className="border-gray-200"
													style={{
														width: LAYOUT.cellWidth,
														height: LAYOUT.rowHeight,
													}}
												>
													<div
														className="flex h-full items-center justify-center border-r border-b bg-white"
														style={{
															width: LAYOUT.cellWidth,
															height: LAYOUT.rowHeight,
														}}
													>
														<ShiftBadge
															type={shift?.shiftType ?? "off"}
															nurseName={nurse?.name ?? "Nurse"}
															nurseId={nurse.id}
															date={dateKey}
															assignmentId={shift?.id}
															shifts={shifts}
															editable={editable}
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
			</div>
		</div>
	);
}
