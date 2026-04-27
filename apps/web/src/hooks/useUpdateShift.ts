"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ShiftType } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

function shiftIdToShiftType(shiftId: string | null): ShiftType {
	if (!shiftId) return "off";
	if (shiftId.endsWith("morning")) return "morning";
	if (shiftId.endsWith("evening")) return "evening";
	if (shiftId.endsWith("night")) return "night";
	return "off";
}

function extractYearMonth(dateKey: string): { year: number; month: number } {
	const [yearStr, monthStr] = dateKey.split("-");
	return {
		year: Number.parseInt(yearStr, 10),
		month: Number.parseInt(monthStr, 10),
	};
}

type UpdateShiftVariables = {
	id: string;
	shiftId: string | null;
	nurseId: string;
	dateKey: string;
};

const emptyCounts = {
	morning: 0,
	evening: 0,
	night: 0,
	total: 0,
};

function incrementShiftCount(
	counts: { morning: number; evening: number; night: number; total: number },
	shiftType: ShiftType,
) {
	if (shiftType === "off") return counts;
	return {
		...counts,
		[shiftType]: counts[shiftType] + 1,
	};
}

function decrementShiftCount(
	counts: { morning: number; evening: number; night: number; total: number },
	shiftType: ShiftType,
) {
	if (shiftType === "off") return counts;
	return {
		...counts,
		[shiftType]: Math.max(0, counts[shiftType] - 1),
	};
}

export function useUpdateShift() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, shiftId, nurseId, dateKey }: UpdateShiftVariables) =>
			trpcClient.roster.updateShift.mutate({ id, shiftId, nurseId, dateKey }),

		onMutate: async ({ nurseId, dateKey, shiftId }) => {
			const { year, month } = extractYearMonth(dateKey);
			const queryKey = QUERY_KEYS.schedules(year, month);

			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<SchedulesResponse>(queryKey);

			const newShiftType = shiftIdToShiftType(shiftId);
			const oldShiftType =
				previous?.nurseRows.find((row) => row.nurse.id === nurseId)
					?.assignments[dateKey]?.shiftType ?? "off";

			queryClient.setQueryData(queryKey, (old) => {
				const current = old as SchedulesResponse | undefined;
				if (!current) return current;

				const targetRow = current.nurseRows.find(
					(row) => row.nurse.id === nurseId,
				);
				if (!targetRow) return current;

				const wasOff = oldShiftType === "off";
				const isNowOff = newShiftType === "off";
				const previousCounts = current.dailyShiftCounts[dateKey] ?? emptyCounts;

				return {
					...current,
					nurseRows: current.nurseRows.map((row) => {
						if (row.nurse.id !== nurseId) return row;
						const metricCounts = incrementShiftCount(
							decrementShiftCount(row.assignedShiftMetrics, oldShiftType),
							newShiftType,
						);
						return {
							...row,
							assignments: {
								...row.assignments,
								[dateKey]: {
									id: row.assignments[dateKey]?.id ?? "",
									shiftType: newShiftType,
								},
							},
							assignedShiftMetrics: {
								...metricCounts,
								total:
									row.assignedShiftMetrics.total +
									(wasOff && !isNowOff ? 1 : 0) +
									(!wasOff && isNowOff ? -1 : 0),
							},
						};
					}),
					dailyShiftCounts: {
						...current.dailyShiftCounts,
						[dateKey]: {
							...incrementShiftCount(
								decrementShiftCount(previousCounts, oldShiftType),
								newShiftType,
							),
							total:
								previousCounts.total +
								(wasOff && !isNowOff ? 1 : 0) +
								(!wasOff && isNowOff ? -1 : 0),
						},
					},
				};
			});

			return { previous };
		},

		onError: (_err, vars, context) => {
			if (context?.previous) {
				const { year, month } = extractYearMonth(vars.dateKey);
				queryClient.setQueryData(
					QUERY_KEYS.schedules(year, month),
					context.previous,
				);
			}

			toast.error("Failed to update shift");
		},

		onSuccess: () => {
			toast.success("Shift updated successfully");
		},
	});
}
