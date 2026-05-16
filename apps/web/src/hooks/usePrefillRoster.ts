import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export const usePrefillRoster = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["prefill-default"],
		mutationFn: async ({ year, month }: { year: number; month: number }) => {
			return await trpcClient.roster.prefillDefault.mutate({
				year,
				month,
			});
		},
		onSuccess: async (result, { year, month }) => {
			const response = result as { success: boolean; error?: string };
			if (!response.success) {
				toast.error("Failed to prefill default", {
					description: response.error,
				});
				return;
			}
			toast.success("Default prefill completed", {
				description: `Schedule for ${month}/${year} has been updated.`,
			});
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.schedules(year, month),
			});
		},
		onError: (error) => {
			toast.error("Failed to prefill default", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});
};
