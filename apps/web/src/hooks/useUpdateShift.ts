"use client";

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

export function useUpdateShift() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, shiftId, nurseId, dateKey }: UpdateShiftVariables) =>
			trpcClient.roster.updateShift.mutate({ id, shiftId, nurseId, dateKey }),

		onSuccess: (_data, vars) => {
			const { year, month } = extractYearMonth(vars.dateKey);
			queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.schedules(year, month),
			});
			toast.success("Shift updated successfully");
		},

		onError: () => {
			toast.error("Failed to update shift");
		},
	});
}
