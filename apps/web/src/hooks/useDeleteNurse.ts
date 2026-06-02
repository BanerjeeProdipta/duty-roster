"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export function useDeleteNurse(options?: { onSuccess?: () => void }) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: async (nurseId: string) => {
			return trpcClient.roster.deleteNurse.mutate({ nurseId });
		},

		onSuccess: () => {
			toast.success("Nurse deleted successfully");
			queryClient.invalidateQueries({ queryKey: QUERY_KEYS.schedulesBase });
			options?.onSuccess?.();
		},

		onError: (error: Error) => {
			toast.error(`Failed to delete nurse: ${error.message}`);
		},
	});

	return mutation;
}
