"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

interface PreferenceUpdate {
	nurseId: string;
	shiftId: string;
	weight: number;
	active: boolean;
}

export function useUpdatePreferences(options?: { onSuccess?: () => void }) {
	const router = useRouter();

	const mutation = useMutation({
		mutationFn: async ({
			preferences,
			daysInMonth,
		}: {
			preferences: PreferenceUpdate[];
			daysInMonth: number;
		}) =>
			trpcClient.roster.updateNurseShiftPreferences.mutate({
				preferences,
				daysInMonth,
			}),

		onSuccess: (...args) => {
			toast.success("Preferences saved successfully");
			router.refresh();
			options?.onSuccess?.(...args);
		},

		onError: (error: Error) => {
			toast.error(`Failed to save: ${error.message}`);
		},
	});

	return mutation;
}

export function useUpdateNurseActive(options?: { onSuccess?: () => void }) {
	const router = useRouter();

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

		onSuccess: (...args) => {
			toast.success("Active status updated");
			router.refresh();
			options?.onSuccess?.(...args);
		},

		onError: (error: Error) => {
			toast.error(`Failed to update: ${error.message}`);
		},
	});

	return mutation;
}

export function convertToPreferences(
	nurse: {
		id: string;
		morning: number;
		evening: number;
		night: number;
		active: boolean;
	},
	totalDays: number,
): PreferenceUpdate[] {
	return [
		{
			nurseId: nurse.id,
			shiftId: "shift_morning",
			weight: Math.round((nurse.morning / totalDays) * 100),
			active: nurse.active,
		},
		{
			nurseId: nurse.id,
			shiftId: "shift_evening",
			weight: Math.round((nurse.evening / totalDays) * 100),
			active: nurse.active,
		},
		{
			nurseId: nurse.id,
			shiftId: "shift_night",
			weight: Math.round((nurse.night / totalDays) * 100),
			active: nurse.active,
		},
	];
}
