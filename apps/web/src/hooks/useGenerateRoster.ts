import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export const useGenerateRoster = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ["generate-roster"],
		mutationFn: ({ year, month }: { year: number; month: number }) =>
			trpcClient.roster.generateRoster.mutate({ year, month }),

		onSuccess: async (_result, { year, month }) => {
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
