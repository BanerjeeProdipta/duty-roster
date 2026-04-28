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

type UpdateShiftVariables = {
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

export function useUpdateShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, shiftId, nurseId, dateKey }: UpdateShiftVariables) =>
      trpcClient.roster.updateShift.mutate({ id, shiftId, nurseId, dateKey }),

    onSuccess: (result, vars) => {
      toast.success("Shift updated successfully");

      if (!result) return;

      const { year, month } = extractYearMonth(vars.dateKey);
      const queryKey = QUERY_KEYS.schedules(year, month);

      queryClient.setQueryData<SchedulesResponse>(queryKey, (old) => {
        if (!old) return old;

        const {
          id: updatedId,
          dateKey,
          nurseId,
          oldShiftType,
          newShiftType,
        } = result as ShiftUpdateResult;

        return {
          ...old,
          nurseRows: old.nurseRows.map((row) => {
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
                  id: updatedId,
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
              (!oldShiftType || oldShiftType === "off" ? 0 : -1) +
              (!newShiftType || newShiftType === "off" ? 0 : 1),
          },
          dailyShiftCounts: {
            ...old.dailyShiftCounts,
            [dateKey]: (() => {
              const prev = old.dailyShiftCounts[dateKey] || emptyCounts;
              const updated: ShiftMetrics = { ...prev };

              if (oldShiftType && oldShiftType !== "off") {
                updated[oldShiftType] = Math.max(
                  0,
                  (updated[oldShiftType] || 0) - 1,
                );
              }
              if (newShiftType && newShiftType !== "off") {
                updated[newShiftType] = (updated[newShiftType] || 0) + 1;
              }
              updated.total =
                (updated.morning || 0) +
                (updated.evening || 0) +
                (updated.night || 0);

              return updated;
            })(),
          },
        };
      });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to update shift");
    },
  });
}
