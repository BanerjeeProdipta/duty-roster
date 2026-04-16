"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import Loader from "@/components/loader";
import { trpc, trpcClient } from "@/utils/trpc";
import { RosterHeader } from "./roster-header";
import { NURSES } from "./roster-matrix.constants";
import type { Shift } from "./roster-matrix.types";
import {
	getNursesFromScheduleRows,
	getWeekDateRange,
	type ScheduleRow,
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
		weekDates,
		setShifts,
		shiftMap,
		updateShift,
		isWeekTransitioning,
		goToPreviousWeek,
		goToNextWeek,
		goToCurrentWeek,
	} = useRosterState(initialNurses, initialShifts);
	const initialDateRange = getWeekDateRange(0);
	const activeDateRange = useMemo(
		() => ({
			startDate: weekDates[0]?.toISOString() ?? initialDateRange.startDate,
			endDate:
				weekDates[weekDates.length - 1]?.toISOString() ??
				initialDateRange.endDate,
		}),
		[initialDateRange.endDate, initialDateRange.startDate, weekDates],
	);
	const isInitialWeek =
		activeDateRange.startDate === initialDateRange.startDate &&
		activeDateRange.endDate === initialDateRange.endDate;
	const schedulesQuery = useQuery(
		trpc.roster.getSchedules.queryOptions(activeDateRange, {
			initialData: isInitialWeek ? initialSchedules : undefined,
			staleTime: 60_000,
			refetchOnMount: !isInitialWeek,
			refetchOnWindowFocus: !isInitialWeek,
		}),
	);
	const nurses = useMemo(() => {
		if (schedulesQuery.data?.schedules.length) {
			return getNursesFromScheduleRows(schedulesQuery.data.schedules);
		}

		return initialNurses;
	}, [initialNurses, schedulesQuery.data]);
	const summary = schedulesQuery.data ?? initialSchedules;
	const generateMutation = useMutation({
		mutationFn: async () => {
			const baseDate = weekDates[0] ?? new Date();

			return trpcClient.roster.generate.mutate({
				year: baseDate.getFullYear(),
				month: baseDate.getMonth() + 1,
			});
		},
		onSuccess: async (result) => {
			if (!result.success) {
				toast.error(result.error ?? "Failed to generate schedule");
				return;
			}

			await schedulesQuery.refetch();
			toast.success(`Generated ${result.total} schedules`);
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	useEffect(() => {
		if (!schedulesQuery.data?.schedules) {
			return;
		}

		const apiShifts: Shift[] = scheduleRowsToShifts(
			schedulesQuery.data.schedules,
		);

		setShifts((previous) => {
			const otherWeeks = previous.filter((shift) =>
				weekDates.every(
					(date) => shift.date !== date.toISOString().split("T")[0],
				),
			);
			const currentWeek: Shift[] = nurses.flatMap((nurse, nurseIndex) =>
				weekDates.map((date, dayIndex) => {
					const dateKey = date.toISOString().split("T")[0] ?? "";
					const existingShift = apiShifts.find(
						(shift) => shift.employeeId === nurse.id && shift.date === dateKey,
					);
					const fallbackShift: Shift = {
						id: `${dayIndex}-${nurseIndex}-${dateKey}`,
						employeeId: nurse.id,
						employeeName: nurse.name,
						date: dateKey,
						shiftType: "off",
					};

					return existingShift ?? fallbackShift;
				}),
			);
			return [...otherWeeks, ...currentWeek];
		});
	}, [nurses, schedulesQuery.data, setShifts, weekDates]);

	if (
		schedulesQuery.isLoading &&
		schedulesQuery.data === undefined &&
		initialSchedules === undefined
	) {
		return <Loader />;
	}

	return (
		<div
			className={`flex flex-1 flex-col transition-opacity duration-150 ${
				isWeekTransitioning ? "opacity-95" : "opacity-100"
			}`}
		>
			<RosterHeader
				nurseCount={nurses.length}
				weekDates={weekDates}
				onPreviousWeek={goToPreviousWeek}
				onNextWeek={goToNextWeek}
				onCurrentWeek={goToCurrentWeek}
				onGenerate={editable ? () => generateMutation.mutate() : undefined}
				isGenerating={generateMutation.isPending}
			/>
			{summary ? (
				<div className="grid gap-4 border-b px-4 py-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
					<div className="rounded-lg border bg-card p-4">
						<h2 className="mb-3 font-semibold text-sm uppercase tracking-wide">
							Daily Shift Counts
						</h2>
						<div className="space-y-2">
							{summary.dailyShiftCounts.map((day) => (
								<div
									key={day.date}
									className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
								>
									<span className="font-medium">
										{new Date(day.date).toLocaleDateString("en-US", {
											weekday: "short",
											month: "short",
											day: "numeric",
										})}
									</span>
									<span className="text-muted-foreground">
										M {day.shifts.morning} | E {day.shifts.evening} | N{" "}
										{day.shifts.night}
									</span>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-lg border bg-card p-4">
						<h2 className="mb-3 font-semibold text-sm uppercase tracking-wide">
							Nurse Shift Counts
						</h2>
						<div className="max-h-64 overflow-y-auto rounded-md border">
							<table className="w-full table-fixed text-sm">
								<thead className="sticky top-0 bg-card">
									<tr className="border-b text-left text-muted-foreground">
										<th className="px-3 py-2 font-medium">Nurse</th>
										<th className="px-3 py-2 font-medium">M</th>
										<th className="px-3 py-2 font-medium">E</th>
										<th className="px-3 py-2 font-medium">N</th>
										<th className="px-3 py-2 font-medium">Total</th>
									</tr>
								</thead>
								<tbody>
									{summary.nurseShiftCounts.map((entry) => (
										<tr
											key={entry.nurse.id}
											className="border-b last:border-b-0"
										>
											<td className="px-3 py-2 font-medium">
												{entry.nurse.name}
											</td>
											<td className="px-3 py-2">{entry.shifts.morning}</td>
											<td className="px-3 py-2">{entry.shifts.evening}</td>
											<td className="px-3 py-2">{entry.shifts.night}</td>
											<td className="px-3 py-2">
												{entry.shifts.totalAssigned}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			) : null}
			<RosterTable
				nurses={nurses}
				weekDates={weekDates}
				shiftMap={shiftMap}
				editable={editable}
				onShiftChange={updateShift}
			/>
		</div>
	);
}
