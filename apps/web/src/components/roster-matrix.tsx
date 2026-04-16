"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import Loader from "@/components/loader";
import { trpc } from "@/utils/trpc";
import { RosterHeader } from "./roster-header";
import { NURSES } from "./roster-matrix.constants";
import type { Shift } from "./roster-matrix.types";
import {
	getWeekDateRange,
	type ScheduleRow,
	scheduleRowsToShifts,
} from "./roster-matrix.utils";
import { RosterTable } from "./roster-table";
import { useRosterState } from "./use-roster-state";

export function RosterMatrix({
	editable = false,
	initialSchedules,
}: {
	editable?: boolean;
	initialSchedules?: ScheduleRow[];
}) {
	const initialShifts = useMemo(
		() => scheduleRowsToShifts(initialSchedules ?? []),
		[initialSchedules],
	);
	const {
		weekDates,
		setShifts,
		shiftMap,
		updateShift,
		isWeekTransitioning,
		goToPreviousWeek,
		goToNextWeek,
		goToCurrentWeek,
	} = useRosterState(initialShifts);
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

	useEffect(() => {
		if (!schedulesQuery.data) {
			return;
		}

		const apiShifts: Shift[] = scheduleRowsToShifts(schedulesQuery.data);

		setShifts((previous) => {
			const otherWeeks = previous.filter((shift) =>
				weekDates.every(
					(date) => shift.date !== date.toISOString().split("T")[0],
				),
			);
			const currentWeek: Shift[] = NURSES.flatMap((nurse, nurseIndex) =>
				weekDates.map((date, dayIndex) => {
					const dateKey = date.toISOString().split("T")[0] ?? "";
					const existingShift = apiShifts.find(
						(shift) => shift.employeeName === nurse && shift.date === dateKey,
					);
					const fallbackShift: Shift = {
						id: `${dayIndex}-${nurseIndex}-${dateKey}`,
						employeeId: `n${nurseIndex}`,
						employeeName: nurse,
						date: dateKey,
						shiftType: "off",
					};

					return existingShift ?? fallbackShift;
				}),
			);
			return [...otherWeeks, ...currentWeek];
		});
	}, [schedulesQuery.data, setShifts, weekDates]);

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
				nurseCount={NURSES.length}
				weekDates={weekDates}
				onPreviousWeek={goToPreviousWeek}
				onNextWeek={goToNextWeek}
				onCurrentWeek={goToCurrentWeek}
			/>
			<RosterTable
				weekDates={weekDates}
				shiftMap={shiftMap}
				editable={editable}
				onShiftChange={updateShift}
			/>
		</div>
	);
}
