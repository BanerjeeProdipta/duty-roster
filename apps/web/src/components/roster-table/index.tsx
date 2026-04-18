"use client";

import { useMutation } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { getMonthDates } from "@/utils";
import { trpcClient } from "@/utils/trpc";
import { LAYOUT } from "./constants";
import { DayHeaderCell } from "./day-header-cell";
import { NurseIdentityCell } from "./nurse-identity-cell";
import { NurseRow } from "./nurse-row";
import type {
	SchedulesResponse,
	ShiftPreferences,
} from "./roster-matrix.types";

type RosterTableProps = {
	editable?: boolean;
	initialSchedules: SchedulesResponse;
	nurseShiftPreferences?: ShiftPreferences[];
};

export function RosterTable({
	editable = false,
	initialSchedules,
	nurseShiftPreferences = [],
}: RosterTableProps) {
	const { nurseRows, dailyShiftCounts } = initialSchedules;
	const router = useRouter();
	const searchParams = useSearchParams();

	const monthDates = useMemo(() => {
		const y = searchParams.get("year");
		const m = searchParams.get("month");
		return getMonthDates(
			y ? Number.parseInt(y, 10) : undefined,
			m ? Number.parseInt(m, 10) : undefined,
		);
	}, [searchParams]);
	const parentRef = useRef<HTMLDivElement>(null);

	const rowVirtualizer = useVirtualizer({
		count: nurseRows.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => LAYOUT.rowHeight,
		overscan: 10,
	});

	const weekDates = useMemo(
		() => monthDates.map((d) => new Date(`${d}T12:00:00Z`)),
		[monthDates],
	);

	const todayStr = useMemo(() => new Date().toDateString(), []);

	const normalizedDates = useMemo(() => {
		return weekDates.map((date) => {
			const isToday = date.toDateString() === todayStr;
			const dayOfWeek = date.toLocaleDateString("en-US", { weekday: "short" });

			return {
				date,
				time: date.getTime(),
				isToday,
				label: dayOfWeek,
				formatted: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
				shortLabel: date.toLocaleDateString("en-US", {
					weekday: "short",
					month: "short",
					day: "numeric",
				}),
				key: date.getTime(),
			};
		});
	}, [weekDates, todayStr]);

	const updateMutation = useMutation({
		mutationFn: (variables: { id: string; shiftId: string | null }) =>
			trpcClient.roster.updateShift.mutate(variables),
		onSuccess: () => {
			toast.success("Shift updated successfully");
			router.refresh();
		},
		onError: (error) => {
			toast.error(`Update failed: ${error.message}`);
		},
	});

	return (
		<div className="relative flex h-[calc(100vh-140px)] animate-fade-in flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
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
								const counts = dailyShiftCounts.find(
									(c) => c.date === date.date.toISOString().split("T")[0],
								)?.shifts;

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
						<tr>
							<td colSpan={weekDates.length + 1} className="p-0 align-top">
								<div
									className="relative w-full"
									style={{
										height: rowVirtualizer.getTotalSize(),
									}}
								>
									{rowVirtualizer.getVirtualItems().map((row) => {
										const nurseRowData = nurseRows[row.index];
										if (!nurseRowData) return null;

										const { nurse, shifts: counts, assignments } = nurseRowData;
										const pref = nurseShiftPreferences.find(
											(p) => p.nurseId === nurse.id,
										);

										return (
											<div
												key={nurse.id}
												className="absolute top-0 left-0 flex w-full"
												style={{
													height: row.size,
													transform: `translateY(${row.start}px)`,
												}}
											>
												<div
													className="sticky left-0 z-20 bg-white"
													style={{
														width: LAYOUT.nameColWidth,
														minWidth: LAYOUT.nameColWidth,
													}}
												>
													<NurseIdentityCell
														nurse={nurse}
														counts={counts}
														pref={pref}
														totalDays={normalizedDates.length}
													/>
												</div>

												<div className="flex flex-1">
													<NurseRow
														nurse={nurse}
														dates={weekDates}
														assignments={assignments}
														editable={editable}
														onUpdateShift={(id, shiftId) =>
															updateMutation.mutate({ id, shiftId })
														}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	);
}
