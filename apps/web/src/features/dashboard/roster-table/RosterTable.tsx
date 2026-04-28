"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMutationState } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useShifts } from "@/hooks/useGetShifts";
import { useRosterDates } from "@/hooks/useRosterDates";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import { DayHeaderCell } from "./DayHeaderCell";
import { LAYOUT } from "./Layout";
import { NurseIdentityCell } from "./NurseIdentityCell";
import { NurseRow } from "./NurseRow";
import { RosterTableSkeleton } from "./RosterTableSkeleton";

interface RosterTableProps {
	editable?: boolean;
	initialSchedules?: SchedulesResponse;
}

export function RosterTable({
	editable = false,
	initialSchedules,
}: RosterTableProps) {
	const { schedules, isLoading, isFetching } = useScheduleInit(initialSchedules);
	const searchParams = useSearchParams();
	const qParam = searchParams.get("q") ?? "";

	// Track generation mutation state
	const generatingState = useMutationState({
		filters: { mutationKey: ["generate-roster"], status: "pending" },
		select: (mutation) => mutation.state.status,
	});
	const isGenerating = generatingState.length > 0;

	const shifts = useShifts();
	const { weekDates, normalizedDates } = useRosterDates();

	let nurseRows = schedules?.nurseRows ?? [];

	if (qParam.trim()) {
		nurseRows = nurseRows.filter((row) =>
			row.nurse.name.toLowerCase().includes(qParam.toLowerCase()),
		);
	}

	const dailyShiftCounts = schedules?.dailyShiftCounts ?? {};

	if ((isLoading || isGenerating) && !schedules?.nurseRows?.length) {
		return <RosterTableSkeleton />;
	}

	if (!nurseRows?.length) {
		return <div className="p-4 text-slate-500">No schedules found</div>;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="relative flex h-[calc(100vh-98px)] flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
				<div className="scrollbar-hide min-h-0 flex-1 overflow-auto">
					<table
						data-testid="roster-table"
						className="w-full table-fixed border-separate border-spacing-0"
					>
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
								{normalizedDates.map((date) => (
									<th
										key={date.key}
										className="sticky top-0 z-[10] bg-[#f2f2f2]"
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
								))}
							</tr>
						</thead>
						<tbody>
							{nurseRows.map(
								({
									nurse,
									assignments,
									preferenceWiseShiftMetrics,
									assignedShiftMetrics,
								}) => (
									<tr key={nurse.id}>
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
											style={{ height: LAYOUT.rowHeight }}
										>
											<NurseRow
												nurse={nurse}
												dates={weekDates}
												assignments={assignments}
												shifts={shifts}
												editable={editable}
											/>
										</td>
									</tr>
								),
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
