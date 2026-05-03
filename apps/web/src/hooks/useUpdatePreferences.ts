"use client";

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

export function useUpdateNurseActive(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async ({
			nurseId,
			active,
		}: {
			nurseId: string;
			active: boolean;
		}) => {
			console.log("📡 Updating nurse active:", { nurseId, active });
			return trpcClient.roster.updateNurse.mutate({
				nurseId,
				active,
			});
		},

		onSuccess: () => {
			toast.success("Active status updated");
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedulesBase });
			options?.onSuccess?.();
		},

		onError: (error: Error) => {
			toast.error(`Failed to update: ${error.message}`);
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
