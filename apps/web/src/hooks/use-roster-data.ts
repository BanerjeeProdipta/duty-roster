import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { trpc } from "@/utils/trpc";
import { NURSES } from "../components/roster-matrix.constants";
import type { Shift, ShiftType } from "../components/roster-matrix.types";
import type { SchedulesResponse } from "../components/roster-matrix.utils";
import {
	buildShiftKey,
	getNursesFromScheduleRows,
	scheduleRowsToShifts,
} from "../components/roster-matrix.utils";
import { useRosterStore } from "../store/use-roster-store";

interface NursePreference {
	nurseId: string;
	morning: number;
	evening: number;
	night: number;
}

export function useRosterData(initialSchedules?: SchedulesResponse) {
	const { selectedMonth, setShifts, setNurses, setPreferences } =
		useRosterStore();

	const monthDateRange = useMemo(() => {
		const dates = Array.from({ length: 31 }, (_, i) => i + 1)
			.map((d) => {
				try {
					const date = new Date(
						Date.UTC(selectedMonth.year, selectedMonth.month - 1, d, 12),
					);
					if (date.getUTCMonth() !== selectedMonth.month - 1) return null;
					return date.toISOString().split("T")[0];
				} catch {
					return null;
				}
			})
			.filter((d): d is string => !!d);

		if (dates.length === 0) return { startDate: "", endDate: "" };
		return {
			startDate: dates[0]!,
			endDate: dates[dates.length - 1]!,
		};
	}, [selectedMonth]);

	const schedulesQuery = useQuery(
		trpc.roster.getSchedules.queryOptions(monthDateRange, {
			initialData: initialSchedules,
			staleTime: 60_000,
		}),
	);

	const preferencesQuery = useQuery(
		trpc.roster.getNurseShiftPreferences.queryOptions({
			staleTime: 60_000,
		}),
	);

	const initialNurses = useMemo(() => {
		const rows = schedulesQuery.data?.schedules ?? [];
		if (!rows.length) {
			return NURSES.map((name, index) => ({
				id: `fallback-${index}`,
				name,
			}));
		}
		return getNursesFromScheduleRows(rows);
	}, [schedulesQuery.data]);

	useEffect(() => {
		if (!schedulesQuery.data?.schedules) return;

		const apiShifts = scheduleRowsToShifts(schedulesQuery.data.schedules);
		const monthDatesList = Array.from({ length: 31 }, (_, i) => i + 1)
			.map((d) => {
				const date = new Date(
					Date.UTC(selectedMonth.year, selectedMonth.month - 1, d, 12),
				);
				if (date.getUTCMonth() !== selectedMonth.month - 1) return null;
				return date.toISOString().split("T")[0];
			})
			.filter((d): d is string => !!d);

		const fullShifts = initialNurses.flatMap((nurse) =>
			monthDatesList.map((dateStr) => {
				const existing = apiShifts.find(
					(s) => s.employeeId === nurse.id && s.date === dateStr,
				);

				return (
					existing ?? {
						id: `${nurse.id}-${dateStr}`,
						employeeId: nurse.id,
						employeeName: nurse.name,
						date: dateStr,
						shiftType: "off" as ShiftType,
					}
				);
			}),
		);

		setShifts(fullShifts);
		setNurses(initialNurses);

		// Sync preferences
		if (preferencesQuery.data) {
			const totalDaysInMonth = monthDatesList.length;
			const prefMap: Record<
				string,
				{ morning: number; evening: number; night: number }
			> = {};

			preferencesQuery.data.forEach((p: any) => {
				prefMap[p.nurseId] = {
					morning: Math.round(((p.morning || 0) / 100) * totalDaysInMonth),
					evening: Math.round(((p.evening || 0) / 100) * totalDaysInMonth),
					night: Math.round(((p.night || 0) / 100) * totalDaysInMonth),
				};
			});
			setPreferences(prefMap);
		}
	}, [
		schedulesQuery.data,
		preferencesQuery.data,
		selectedMonth,
		initialNurses,
		setShifts,
		setNurses,
		setPreferences,
	]);

	const shifts = useRosterStore((s) => s.shifts);
	const shiftMap = useMemo(() => {
		const map = new Map<string, Shift>();
		shifts.forEach((shift) => {
			map.set(buildShiftKey(shift.employeeName, shift.date), shift);
		});
		return map;
	}, [shifts]);

	return {
		isLoading: schedulesQuery.isLoading || preferencesQuery.isLoading,
		summary: schedulesQuery.data,
		refetch: () => {
			schedulesQuery.refetch();
			preferencesQuery.refetch();
		},
	};
}
