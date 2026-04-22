"use client";

import { useRosterDates } from "../../hooks/useRosterDates";
import { useRosterRows } from "../../hooks/useRosterRows";
import { useRosterSchedules } from "../../hooks/useRosterSchedules";
import { useShifts } from "../../hooks/useShifts";
import { DayHeaderCell } from "./DayHeaderCell";
import { LAYOUT } from "./Layout";
import { NurseIdentityCell } from "./NurseIdentityCell";
import { NurseRow } from "./NurseRow";
import type { SchedulesResponse } from "./RosterMatrix.types";

type RosterTableProps = {
	editable?: boolean;
	year: number;
	month: number;
	initialSchedules: SchedulesResponse;
};

export function RosterTable({
	editable = false,
	year,
	month,
	initialSchedules,
}: RosterTableProps) {
	const { data: schedulesData } = useRosterSchedules(
		year,
		month,
		initialSchedules,
	);
	const rosterData = schedulesData ?? initialSchedules;
	const shifts = useShifts();
	const { weekDates, normalizedDates } = useRosterDates();
	const { filteredNurseRows, parentRef } = useRosterRows(rosterData);

	const { dailyShiftCounts } = rosterData;

	if (!filteredNurseRows?.length) {
		return <div className="p-4 text-slate-500">No nurses found</div>;
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
									className="sticky top-0 left-0 z-[30] border-r border-b bg-slate-50 px-3 py-3 text-center"
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

						<tbody>
							{filteredNurseRows.map((nurseRowData) => {
								const {
									nurse,
									shifts: counts,
									assignments,
									preference,
								} = nurseRowData;

								return (
									<tr key={nurse.id} className="flex w-full">
										<td
											className="sticky left-0 z-20 bg-white"
											style={{
												width: LAYOUT.nameColWidth,
												minWidth: LAYOUT.nameColWidth,
											}}
										>
											<NurseIdentityCell
												nurse={nurse}
												counts={counts}
												pref={preference}
												totalDays={normalizedDates.length}
												editable={editable}
											/>
										</td>

										<td className="flex flex-1">
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
