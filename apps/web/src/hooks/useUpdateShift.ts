"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ShiftType } from "@/components/roster-table/RosterMatrix.types";
import { useRosterStore } from "@/store/roster/useRosterStore";
import { trpcClient } from "@/utils/trpc";

function shiftIdToShiftType(shiftId: string | null): ShiftType {
	if (!shiftId) return "off";
	if (shiftId.endsWith("morning")) return "morning";
	if (shiftId.endsWith("evening")) return "evening";
	if (shiftId.endsWith("night")) return "night";
	return "off";
}

type UpdateShiftVariables = {
	id: string;
	shiftId: string | null;
	nurseId: string;
	dateKey: string;
};

export function useUpdateShift() {
	return useMutation({
		mutationFn: ({ id, shiftId }: UpdateShiftVariables) =>
			trpcClient.roster.updateShift.mutate({ id, shiftId }),

		onMutate: ({ nurseId, dateKey, shiftId }) => {
			useRosterStore
				.getState()
				.updateAssignment(nurseId, dateKey, shiftIdToShiftType(shiftId));
		},

		onError: () => {
			toast.error("Failed to update shift");
		},

		onSuccess: () => {
			toast.success("Shift updated successfully");
		},
	});
}
