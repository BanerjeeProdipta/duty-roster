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

				return {
					...current,
					nurseRows: current.nurseRows.map((row) => {
						if (row.nurse.id !== nurseId) return row;

						const newMetrics = { ...row.assignedShiftMetrics };

						if (oldShiftType !== "off") {
							newMetrics[oldShiftType] = Math.max(
								0,
								newMetrics[oldShiftType] - 1,
							);
						}
						if (newShiftType !== "off") {
							newMetrics[newShiftType] = (newMetrics[newShiftType] || 0) + 1;
						}
						newMetrics.total =
							(newMetrics.morning || 0) +
							(newMetrics.evening || 0) +
							(newMetrics.night || 0);

						return {
							...row,
							assignments: {
								...row.assignments,
								[dateKey]: {
									id: row.assignments[dateKey]?.id ?? "",
									shiftType: newShiftType,
								},
							},
							assignedShiftMetrics: newMetrics,
						};
					}),
					dailyShiftCounts: {
						...current.dailyShiftCounts,
						[dateKey]: (() => {
							const prev = current.dailyShiftCounts[dateKey] ?? emptyCounts;
							const updated = { ...prev };
							if (oldShiftType !== "off") {
								updated[oldShiftType] = Math.max(
									0,
									(updated[oldShiftType] || 0) - 1,
								);
							}
							if (newShiftType !== "off") {
								updated[newShiftType] =
									((updated[newShiftType] as number) || 0) + 1;
							}
							updated.total =
								((updated.morning as number) || 0) +
								((updated.evening as number) || 0) +
								((updated.night as number) || 0);
							return updated;
						})(),
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

		onSuccess: (_data, vars) => {
			const { year, month } = extractYearMonth(vars.dateKey);
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.schedules(year, month),
			});
			toast.success("Shift updated successfully");
		},
	});
}
