"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
	SchedulesResponse,
	ShiftType,
} from "@/components/roster-table/RosterMatrix.types";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

function shiftIdToShiftType(shiftId: string | null): ShiftType {
	if (!shiftId) return "off";
	if (shiftId.endsWith("morning")) return "morning";
	if (shiftId.endsWith("evening")) return "evening";
	if (shiftId.endsWith("night")) return "night";
	return "off";
}

export function useUpdateShift() {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (variables: { id: string; shiftId: string | null }) =>
			trpcClient.roster.updateShift.mutate(variables),
		onMutate: async (variables) => {
			await queryClient.cancelQueries({ queryKey: QUERY_KEYS.rosterBase });

			const previousRosterQueries =
				queryClient.getQueriesData<SchedulesResponse>({
					queryKey: QUERY_KEYS.rosterBase,
				});
			const nextShiftType = shiftIdToShiftType(variables.shiftId);

			queryClient.setQueriesData<SchedulesResponse>(
				{ queryKey: QUERY_KEYS.rosterBase },
				(current) => {
					if (!current) return current;
					return {
						...current,
						nurseRows: current.nurseRows.map((row) => ({
							...row,
							assignments: Object.fromEntries(
								Object.entries(row.assignments).map(([dateKey, assignment]) => {
									if (!assignment || assignment.id !== variables.id) {
										return [dateKey, assignment];
									}

									return [
										dateKey,
										{
											...assignment,
											shiftType: nextShiftType,
										},
									];
								}),
							) as typeof row.assignments,
						})),
					};
				},
			);

			return { previousRosterQueries };
		},
		onSuccess: () => {
			toast.success("Shift updated successfully");
		},
		onError: (error, _variables, context) => {
			context?.previousRosterQueries?.forEach(([queryKey, data]) => {
				queryClient.setQueryData(queryKey, data);
			});
			toast.error(`Update failed: ${error.message}`);
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rosterBase });
			queryClient.invalidateQueries({
				predicate: ({ queryKey }) =>
					queryKey[0] === QUERY_KEYS.shiftRequirements(0, 0)[0],
			});
		},
	});

	return mutation;
}
