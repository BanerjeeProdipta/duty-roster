"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
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
			morning,
			evening,
			night,
			totalDays,
		}: {
			nurseId: string;
			active: boolean;
			morning: number;
			evening: number;
			night: number;
			totalDays: number;
		}) => {
			const preferences: PreferenceUpdate[] = [
				{
					nurseId,
					shiftId: "shift_morning",
					weight: Math.round((morning / totalDays) * 100),
					active,
				},
				{
					nurseId,
					shiftId: "shift_evening",
					weight: Math.round((evening / totalDays) * 100),
					active,
				},
				{
					nurseId,
					shiftId: "shift_night",
					weight: Math.round((night / totalDays) * 100),
					active,
				},
			];
			return trpcClient.roster.updateNurseShiftPreferences.mutate({
				preferences,
				daysInMonth: totalDays,
			});
		},

		onSuccess: () => {
			toast.success("Active status updated");
			queryClient.invalidateQueries({ queryKey: ["schedules"] });
			options?.onSuccess?.();
		},

		onError: (error: Error) => {
			toast.error(`Failed to update: ${error.message}`);
		},
	});

	return mutation;
}
