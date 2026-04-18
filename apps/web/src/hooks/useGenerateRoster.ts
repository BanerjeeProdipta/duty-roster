import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

export const useGenerateRoster = () => {
	const router = useRouter();

	return useMutation({
		mutationFn: async ({ year, month }: { year: number; month: number }) =>
			trpcClient.roster.generateRoster.mutate({
				year,
				month,
			}),

		onSuccess: async (result, _variables) => {
			toast.success(`Generated ${result.schedulesCreated} schedules`);
			router.refresh();
		},

		onError: () => {
			toast.error("Failed to generate schedule");
		},
	});
};
