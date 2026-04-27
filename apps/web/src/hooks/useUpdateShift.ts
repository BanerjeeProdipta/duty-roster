"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

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

type ShiftUpdateResult = {
	dateKey: string;
	nurseId: string;
	oldShiftType: string | null;
	newShiftType: string | null;
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

		onSuccess: (result, vars) => {
			if (!result) return;

			const { year, month } = extractYearMonth(vars.dateKey);
			const queryKey = QUERY_KEYS.schedules(year, month);

			queryClient.setQueryData<SchedulesResponse>(queryKey, (old) => {
				if (!old) return old;

				const { dateKey, nurseId, oldShiftType, newShiftType } =
					result as ShiftUpdateResult;

				return {
					...old,
					nurseRows: old.nurseRows.map((row) => {
						if (row.nurse.id !== nurseId) return row;

						const newMetrics = { ...row.assignedShiftMetrics };

						if (oldShiftType && oldShiftType !== "off") {
							newMetrics[oldShiftType] = Math.max(
								0,
								(newMetrics[oldShiftType] || 0) - 1,
							);
						}
						if (newShiftType && newShiftType !== "off") {
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
									id: row.assignments[dateKey]?.id || "",
									shiftType: newShiftType || "off",
								},
							},
							assignedShiftMetrics: newMetrics,
						};
					}),
					assignedShiftCounts: {
						morning:
							(old.assignedShiftCounts?.morning || 0) +
							(oldShiftType === "morning" ? -1 : 0) +
							(newShiftType === "morning" ? 1 : 0),
						evening:
							(old.assignedShiftCounts?.evening || 0) +
							(oldShiftType === "evening" ? -1 : 0) +
							(newShiftType === "evening" ? 1 : 0),
						night:
							(old.assignedShiftCounts?.night || 0) +
							(oldShiftType === "night" ? -1 : 0) +
							(newShiftType === "night" ? 1 : 0),
						total:
							(old.assignedShiftCounts?.total || 0) +
							(oldShiftType === "off" || !oldShiftType ? 0 : -1) +
							(newShiftType === "off" || !newShiftType ? -1 : 1),
					},
					dailyShiftCounts: {
						...old.dailyShiftCounts,
						[dateKey]: (() => {
							const prev = old.dailyShiftCounts[dateKey] || emptyCounts;
							const updated = { ...prev };

							if (oldShiftType && oldShiftType !== "off") {
								updated[oldShiftType] = Math.max(
									0,
									(updated[oldShiftType] || 0) - 1,
								);
							}
							if (newShiftType && newShiftType !== "off") {
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

			toast.success("Shift updated");
		},

		onError: (error) => {
			toast.error(error.message || "Failed to update shift");
		},
	});
}
