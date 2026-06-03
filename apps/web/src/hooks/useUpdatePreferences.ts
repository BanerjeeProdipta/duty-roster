"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

interface PreferenceUpdate {
	nurseId: string;
	shiftId: string;
	weight: number;
	active: boolean;
}

export function useUpdatePreferences(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async ({
			preferences,
			daysInMonth,
		}: {
			preferences: PreferenceUpdate[];
			daysInMonth: number;
		}) => {
			return trpcClient.roster.updateNurseShiftPreferences.mutate({
				preferences,
				daysInMonth,
			});
		},

		onSuccess: () => {
			toast.success("Preferences saved successfully");
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedulesBase });
			options?.onSuccess?.();
		},

		onError: (error: Error) => {
			toast.error(`Failed to save: ${error.message}`);
		},
	});

	return mutation;
}

export function useUpdateNurseActive(options?: {
	onSuccess?: () => void;
	skipInvalidate?: boolean;
}) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async ({
			nurseId,
			active,
		}: {
			nurseId: string;
			active: boolean;
		}) => {
			return trpcClient.roster.updateNurse.mutate({
				nurseId,
				active,
			});
		},

		onMutate: async ({ nurseId, active }) => {
			// Cancel any outgoing refetches so they don't overwrite our optimistic update
			await queryClient.cancelQueries({
				queryKey: QUERY_KEYS.schedulesBase,
			});

			// Snapshot the previous values
			const previousQueries = queryClient.getQueriesData<SchedulesResponse>({
				queryKey: QUERY_KEYS.schedulesBase,
			});

			// Optimistically update the cache
			queryClient.setQueriesData<SchedulesResponse>(
				{ queryKey: QUERY_KEYS.schedulesBase },
				(old) => {
					if (!old) return old;

					let activeChange = 0;
					const newNurseRows = old.nurseRows.map((row) => {
						if (row.nurse.id !== nurseId) return row;
						const oldActive = row.nurse.active ?? true;
						if (oldActive !== active) {
							activeChange = active ? 1 : -1;
						}
						return {
							...row,
							nurse: {
								...row.nurse,
								active,
							},
						};
					});

					const oldActiveCount = old.nurseCounts?.active ?? 0;
					const newActiveCount = Math.max(0, oldActiveCount + activeChange);

					return {
						...old,
						nurseRows: newNurseRows,
						nurseCounts: old.nurseCounts
							? {
									...old.nurseCounts,
									active: newActiveCount,
								}
							: undefined,
					};
				},
			);

			// Return context with previous queries snapshot
			return { previousQueries };
		},

		onSuccess: () => {
			toast.success("Active status updated");
			if (!options?.skipInvalidate) {
				queryClient.invalidateQueries({
					queryKey: QUERY_KEYS.schedulesBase,
				});
			}
			options?.onSuccess?.();
		},

		onError: (error: Error, _variables, context) => {
			toast.error(`Failed to update: ${error.message}`);
			if (context?.previousQueries) {
				for (const [queryKey, prevData] of context.previousQueries) {
					queryClient.setQueryData(queryKey, prevData);
				}
			}
		},
	});

	return mutation;
}

export function useUpdateNurse(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async ({
			nurseId,
			name,
		}: {
			nurseId: string;
			name?: string;
		}) => {
			return trpcClient.roster.updateNurse.mutate({
				nurseId,
				name,
			});
		},

		onSuccess: () => {
			toast.success("Nurse updated successfully");
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedulesBase });
			options?.onSuccess?.();
		},

		onError: (error: Error) => {
			toast.error(`Failed to update nurse: ${error.message}`);
		},
	});

	return mutation;
}
