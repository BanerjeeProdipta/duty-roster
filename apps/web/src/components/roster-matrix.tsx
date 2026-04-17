"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { trpc, trpcClient } from "@/utils/trpc";
import { RosterHeader } from "./roster-header";
import { NURSES } from "./roster-matrix.constants";
import {
	getNursesFromScheduleRows,
	type SchedulesResponse,
	scheduleRowsToShifts,
} from "./roster-matrix.utils";
import { RosterTable } from "./roster-table";
import { useRosterState } from "./use-roster-state";

export function RosterMatrix({
	editable = false,
	initialSchedules,
}: {
	editable?: boolean;
	initialSchedules?: SchedulesResponse;
}) {
	const initialScheduleRows = initialSchedules?.schedules ?? [];
	const initialShifts = useMemo(
		() => scheduleRowsToShifts(initialScheduleRows),
		[initialScheduleRows],
	);

	const initialNurses = useMemo(() => {
		if (!initialScheduleRows.length) {
			return NURSES.map((name, index) => ({
				id: `fallback-${index}`,
				name,
			}));
		}
		return getNursesFromScheduleRows(initialScheduleRows);
	}, [initialScheduleRows]);

	const {
		monthDates,
		setShifts,
		shiftMap,
		updateShift,
		isTransitioning,
		selectedMonth,
		monthName,
		monthDateRange,
		goToPreviousMonth,
		goToNextMonth,
		goToCurrentMonth,
		changeMonth,
	} = useRosterState(initialNurses, initialShifts);

	const monthDatesAsDate = useMemo(
		() => monthDates.map((d) => new Date(`${d}T00:00:00`)),
		[monthDates],
	);

	const schedulesQuery = useQuery(
		trpc.roster.getSchedules.queryOptions(monthDateRange, {
			initialData: initialSchedules,
			staleTime: 60_000,
		}),
	);

	const summary = schedulesQuery.data ?? initialSchedules;

	const generateMutation = useMutation({
		mutationFn: async () =>
			trpcClient.roster.generateRoster.mutate({
				year: selectedMonth.year,
				month: selectedMonth.month,
			}),
		onSuccess: async (result) => {
			await schedulesQuery.refetch();
			toast.success(`Generated ${result.schedulesCreated} schedules`);
		},
	});

	useEffect(() => {
		if (!schedulesQuery.data?.schedules) return;

		const apiShifts = scheduleRowsToShifts(schedulesQuery.data.schedules);

		setShifts((prev) => {
			const otherMonths = prev.filter((s) => !monthDates.includes(s.date));

			const current = initialNurses.flatMap((nurse, nurseIndex) =>
				monthDates.map((dateStr, dayIndex) => {
					const existing = apiShifts.find(
						(s) => s.employeeId === nurse.id && s.date === dateStr,
					);

					return (
						existing ?? {
							id: `${dayIndex}-${nurseIndex}`,
							employeeId: nurse.id,
							employeeName: nurse.name,
							date: dateStr,
							shiftType: "off",
						}
					);
				}),
			);

			return [...otherMonths, ...current];
		});
	}, [schedulesQuery.data, monthDates, initialNurses, setShifts]);

	if (schedulesQuery.isLoading && !initialSchedules) return <Loader />;

	return (
		<div className={`flex flex-col ${isTransitioning ? "opacity-95" : ""}`}>
			<RosterHeader
				nurseCount={initialNurses.length}
				monthName={monthName}
				selectedMonth={selectedMonth}
				onPreviousMonth={goToPreviousMonth}
				onNextMonth={goToNextMonth}
				onCurrentMonth={goToCurrentMonth}
				onChangeMonth={changeMonth}
				onGenerate={editable ? () => generateMutation.mutate() : undefined}
				isGenerating={generateMutation.isPending}
			/>

			{summary && (
				<div className="grid gap-4 border-b px-4 py-4 lg:grid-cols-[2fr_3fr]">
					{/* DAILY */}
					<div className="rounded-lg border bg-card p-4">
						<h2 className="mb-3 font-semibold text-sm uppercase">
							Daily Shift Counts
						</h2>

						<div className="max-h-64 space-y-2 overflow-y-auto">
							{summary.dailyShiftCounts.map((day) => (
								<div key={day.date} className="rounded border p-3">
									<div className="font-medium text-sm">
										{new Date(day.date).toDateString()}
									</div>

									<div className="mt-2 space-y-2">
										<ShiftBar
											label="Morning"
											value={day.shifts.morning}
											color="bg-[#FDE68A]"
										/>
										<ShiftBar
											label="Evening"
											value={day.shifts.evening}
											color="bg-[#BFDBFE]"
										/>
										<ShiftBar
											label="Night"
											value={day.shifts.night}
											color="bg-[#C4B5FD]"
										/>
									</div>
								</div>
							))}
						</div>
					</div>
					{/* WORKLOAD */}
					<div className="rounded-lg border bg-card p-4">
						<h2 className="mb-3 font-semibold text-sm uppercase">
							Nurse Workload
						</h2>

						<div className="max-h-64 overflow-y-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 bg-card">
									<tr className="border-b text-left text-muted-foreground">
										<th className="px-3 py-2">Nurse</th>
										<th className="px-3 py-2">Load</th>
									</tr>
								</thead>

								<tbody>
									{summary.nurseShiftCounts.map((n) => {
										const total =
											n.shifts.morning + n.shifts.evening + n.shifts.night || 1;

										const m = (n.shifts.morning / total) * 100;
										const e = (n.shifts.evening / total) * 100;
										const ni = (n.shifts.night / total) * 100;

										return (
											<tr key={n.nurse.id} className="border-b">
												<td className="whitespace-nowrap px-3 py-2 font-medium">
													{n.nurse.name}
												</td>

												<td className="w-full px-3 py-2">
													<div className="flex items-center gap-2">
														{/* STACKED BAR */}
														<div className="flex h-4 w-full overflow-hidden rounded-full bg-muted font-semibold text-[10px] text-black/60 shadow-inner">
															<div
																className="flex flex-col items-center justify-center bg-[#FDE68A]"
																style={{ width: `${m}%` }}
															>
																{n.shifts.morning > 0 && n.shifts.morning}
															</div>
															<div
																className="flex flex-col items-center justify-center bg-[#BFDBFE]"
																style={{ width: `${e}%` }}
															>
																{n.shifts.evening > 0 && n.shifts.evening}
															</div>
															<div
																className="flex flex-col items-center justify-center bg-[#C4B5FD]"
																style={{ width: `${ni}%` }}
															>
																{n.shifts.night > 0 && n.shifts.night}
															</div>
														</div>

														<span className="w-10 text-right text-muted-foreground text-xs">
															{n.shifts.totalAssigned}
														</span>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			)}

			<RosterTable
				nurses={initialNurses}
				weekDates={monthDatesAsDate}
				shiftMap={shiftMap}
				editable={editable}
				onShiftChange={updateShift}
			/>
		</div>
	);
}

/* ---------- reusable ---------- */
function ShiftBar({
	label,
	value,
	color,
}: {
	label: string;
	value: number;
	color: string;
}) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<span className="w-20 text-muted-foreground">{label}</span>
			<div className="h-2 flex-1 rounded-full bg-muted">
				<div
					className={`h-2 rounded-full ${color}`}
					style={{ width: `${Math.min(value * 10, 100)}%` }}
				/>
			</div>
			<span className="w-6 text-right text-muted-foreground">{value}</span>
		</div>
	);
}
