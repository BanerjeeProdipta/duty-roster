"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";

export function useUpdateShift() {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (variables: { id: string; shiftId: string | null }) =>
			trpcClient.roster.updateShift.mutate(variables),
		onSuccess: () => {
			toast.success("Shift updated successfully");
			queryClient.invalidateQueries({ queryKey: ["roster"] });
		},
		onError: (error) => {
			toast.error(`Update failed: ${error.message}`);
		},
	});

	return mutation;
}
