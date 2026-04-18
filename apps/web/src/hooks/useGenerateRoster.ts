import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

export const useGenerateRoster = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ year, month }: { year: number; month: number }) =>
			trpcClient.roster.generateRoster.mutate({
				year,
				month,
			}),

		onSuccess: async (result, variables) => {
			await queryClient.invalidateQueries({
				queryKey: ["roster", variables.year, variables.month],
			});

			toast.success(`Generated ${result.schedulesCreated} schedules`);
		},

		onError: () => {
			toast.error("Failed to generate schedule");
		},
	});
};
