"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { useShifts } from "@/hooks/useGetShifts";
import { useRosterDates } from "@/hooks/useRosterDates";
import { useRosterStore } from "@/store/roster/useRosterStore";
import { DayHeaderCell } from "./DayHeaderCell";
import { LAYOUT } from "./Layout";
import { NurseIdentityCell } from "./NurseIdentityCell";
import { NurseRow } from "./NurseRow";
import type { SchedulesResponse } from "./RosterMatrix.types";

type RosterTableProps = {
	editable?: boolean;
	initialSchedules: SchedulesResponse;
};

export function RosterTable({
	editable = false,
	initialSchedules,
}: RosterTableProps) {
	const setInitialSchedules = useRosterStore(
		(state) => state.setInitialSchedules,
	);
	const dailyShiftCounts = useRosterStore((state) => state.dailyShiftCounts);
	const nurseRows = useRosterStore((state) => state.nurseRows);

	const parentRef = useRef<HTMLDivElement>(null);
	const shifts = useShifts();

	useEffect(() => {
		setInitialSchedules(initialSchedules);
	}, [initialSchedules, setInitialSchedules]);

	const { weekDates, normalizedDates } = useRosterDates();

	// Initialize virtualizer for rows
	const rowVirtualizer = useVirtualizer({
		count: nurseRows?.length ?? 0,
		getScrollElement: () => parentRef.current,
		estimateSize: () => LAYOUT.rowHeight,
		overscan: 5, // Render extra rows outside viewport for smooth scrolling
	});

	const virtualItems = rowVirtualizer.getVirtualItems();
	const totalSize = rowVirtualizer.getTotalSize();

	console.log({ virtualItems });

	if (!nurseRows?.length) {
		return <div className="p-4 text-slate-500">No schedules found</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="relative flex h-[calc(100vh-200px)] animate-fade-in flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
				<div
					ref={parentRef}
					className="scrollbar-hide min-h-0 flex-1 overflow-auto"
				>
					<table className="w-full table-fixed border-separate border-spacing-0">
						<thead>
							<tr>
								<th
									className="sticky top-0 left-0 z-[30] border-r border-b bg-slate-50 px-3 py-3 text-center text-slate-600 text-sm uppercase tracking-widest"
									style={{
										width: LAYOUT.nameColWidth,
										height: LAYOUT.headerHeight,
									}}
								>
									Nurses
								</th>

								{normalizedDates.map((date) => {
									const counts = dailyShiftCounts[date.dateStr];

									return (
										<th
											key={date.key}
											className="sticky top-0 z-[10] bg-[#f2f2f2]"
											style={{
												width: LAYOUT.cellWidth,
												height: LAYOUT.headerHeight,
											}}
										>
											<DayHeaderCell date={date} counts={counts} />
										</th>
									);
								})}
							</tr>
						</thead>

						<tbody
							style={{
								height: `${totalSize}px`,
								position: "relative",
							}}
						>
							{virtualItems.map((virtualItem) => {
								const nurseRowData = nurseRows[virtualItem.index];
								const {
									nurse,
									assignments,
									preferenceWiseShiftMetrics,
									assignedShiftMetrics,
								} = nurseRowData;

								return (
									<tr
										key={`${nurse.id}-${virtualItem.index}`}
										style={{
											position: "absolute",
											top: `${virtualItem.start}px`,
											height: `${virtualItem.size}px`,
											width: "100%",
										}}
									>
										<td
											className="sticky left-0 z-20 border-slate-200 border-b bg-white"
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

										<td
											className="border-slate-200 border-b"
											style={{ height: "100%" }}
										>
											<NurseRow
												nurse={nurse}
												dates={weekDates}
												assignments={assignments}
												shifts={shifts}
											/>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
