import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

type PrefillMode = "fairly" | "minimize" | "maximize";

const labelMap: Record<PrefillMode, string> = {
	fairly: "Prefill Fairly",
	minimize: "Minimize Shifts",
	maximize: "Maximize Shifts",
};

export const usePrefillRoster = (mode: PrefillMode) => {
	const queryClient = useQueryClient();
	const mutationKey = [`prefill-${mode}`];

	const mutationFn = async ({
		year,
		month,
	}: {
		year: number;
		month: number;
	}) => {
		if (mode === "fairly") {
			return await trpcClient.roster.prefillFairPreferences.mutate({
				year,
				month,
			});
		}
		if (mode === "minimize") {
			return await trpcClient.roster.prefillMinimizeShifts.mutate({
				year,
				month,
			});
		}
		return await trpcClient.roster.prefillMaximizeShifts.mutate({
			year,
			month,
		});
	};

	return useMutation({
		mutationKey,
		mutationFn,
		onSuccess: async (result, { year, month }) => {
			const response = result as { success: boolean; error?: string };
			const label = labelMap[mode];
			if (!response.success) {
				toast.error(`Failed to ${label.toLowerCase()}`, {
					description: response.error,
				});
				return;
			}
			toast.success(`${label} completed`, {
				description: `Schedule for ${month}/${year} has been updated.`,
			});
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.schedules(year, month),
			});
		},
		onError: (error) => {
			toast.error(`Failed to ${labelMap[mode].toLowerCase()}`, {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});
};
