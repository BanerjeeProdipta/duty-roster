"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ShiftType } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

function extractYearMonth(dateKey: string): { year: number; month: number } {
	const [yearStr, monthStr] = dateKey.split("-");
	return {
		year: Number.parseInt(yearStr, 10),
		month: Number.parseInt(monthStr, 10),
	};
}

type BatchUpdateVariables = {
	id: string;
	shiftId: string | null;
	nurseId: string;
	dateKey: string;
};

type ShiftUpdateResult = {
	id: string;
	dateKey: string;
	nurseId: string;
	oldShiftType: ShiftType | null;
	newShiftType: ShiftType | null;
};

type ShiftMetrics = {
	morning: number;
	evening: number;
	night: number;
	total: number;
};

const emptyCounts: ShiftMetrics = {
	morning: 0,
	evening: 0,
	night: 0,
	total: 0,
};

export function useBatchUpdateShifts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (items: BatchUpdateVariables[]) =>
			trpcClient.roster.batchUpdateShifts.mutate(items),

		onSuccess: (results: ShiftUpdateResult[], _vars) => {
			const count = results.length;
			toast.success(`${count} shift${count > 1 ? "s" : ""} updated`);

			if (!results?.length) return;

			const { year, month } = extractYearMonth(results[0].dateKey);

			queryClient.setQueriesData<SchedulesResponse>(
				{ queryKey: QUERY_KEYS.schedules(year, month) },
				(old) => {
					if (!old) return old;

					let updated = { ...old };
					for (const result of results) {
						const { dateKey, nurseId, oldShiftType, newShiftType } = result;

						updated = {
							...updated,
							nurseRows: updated.nurseRows.map((row) => {
								if (row.nurse.id !== nurseId) return row;
								const newMetrics: ShiftMetrics = {
									...row.assignedShiftMetrics,
								};
								if (oldShiftType && oldShiftType !== "off") {
									newMetrics[oldShiftType] = Math.max(
										0,
										(newMetrics[oldShiftType] || 0) - 1,
									);
								}
								if (newShiftType && newShiftType !== "off") {
									newMetrics[newShiftType] =
										(newMetrics[newShiftType] || 0) + 1;
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
											id: result.id,
											shiftType: newShiftType || "off",
										},
									},
									assignedShiftMetrics: newMetrics,
								};
							}),
							assignedShiftCounts: (() => {
								const c = { ...updated.assignedShiftCounts } as ShiftMetrics;
								if (oldShiftType && oldShiftType !== "off") {
									c[oldShiftType] = Math.max(0, (c[oldShiftType] || 0) - 1);
								}
								if (newShiftType && newShiftType !== "off") {
									c[newShiftType] = (c[newShiftType] || 0) + 1;
								}
								c.total = (c.morning || 0) + (c.evening || 0) + (c.night || 0);
								return c;
							})(),
							dailyShiftCounts: {
								...updated.dailyShiftCounts,
								[dateKey]: (() => {
									const prev = updated.dailyShiftCounts[dateKey] || emptyCounts;
									const d: ShiftMetrics = { ...prev };
									if (oldShiftType && oldShiftType !== "off") {
										d[oldShiftType] = Math.max(0, (d[oldShiftType] || 0) - 1);
									}
									if (newShiftType && newShiftType !== "off") {
										d[newShiftType] = (d[newShiftType] || 0) + 1;
									}
									d.total =
										(d.morning || 0) + (d.evening || 0) + (d.night || 0);
									return d;
								})(),
							},
						};
					}

					return updated;
				},
			);
		},

		onError: (error) => {
			toast.error(error.message || "Failed to update shifts");
		},
	});
}
