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

		onSuccess: async (_result, { year, month }) => {
			toast.success("Generated schedules");
			await queryClient.invalidateQueries({
				queryKey: ["schedules", year, month],
			});
		},

		onError: () => {
			toast.error("Failed to generate schedule");
		},
	});
};
