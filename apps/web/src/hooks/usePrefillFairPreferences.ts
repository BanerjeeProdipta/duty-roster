import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export function usePrefillFairPreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["prefill-fair-preferences"],
		mutationFn: async ({ year, month }: { year: number; month: number }) => {
			const result = await trpcClient.roster.prefillFairPreferences.mutate({
				year,
				month,
			});
			return result;
		},
		onSuccess: async (result) => {
			const response = result as {
				success: boolean;
				updated: number;
				error?: string;
			};
			if (!response.success) {
				toast.error("Failed to prefill preferences", {
					description: response.error,
				});
				return;
			}
			toast.success("Preferences prefilled successfully", {
				description: `Updated preferences for ${response.updated} nurses.`,
			});
			// Invalidate all schedule queries so the UI refetches with new data
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.schedulesBase,
			});
		},
		onError: (error) => {
			toast.error("Failed to prefill preferences", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});
}
