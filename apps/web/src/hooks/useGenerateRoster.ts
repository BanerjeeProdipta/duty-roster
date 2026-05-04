import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export const useGenerateRoster = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["generate-roster"],
		mutationFn: async ({ year, month }: { year: number; month: number }) => {
			const result = await trpcClient.roster.generateRoster.mutate({
				year,
				month,
			});
			return result;
		},

		onSuccess: async (result, { year, month }) => {
			const response = result as { success: boolean; error?: string };
			if (!response.success) {
				toast.error("Failed to generate roster", {
					description: response.error,
				});
				return;
			}
			toast.success("Roster generated successfully", {
				description: `Schedule for ${month}/${year} has been created.`,
			});
			await queryClient.invalidateQueries({
				queryKey: QUERY_KEYS.schedules(year, month),
			});
		},

		onError: (error) => {
			toast.error("Failed to generate roster", {
				description: error instanceof Error ? error.message : "Unknown error",
			});
		},
	});
};
