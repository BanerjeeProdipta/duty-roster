"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ShiftType } from "@/features/dashboard/components/roster-table/RosterMatrix.types";
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
		mutationFn: ({ id, shiftId, nurseId, dateKey }: UpdateShiftVariables) =>
			trpcClient.roster.updateShift.mutate({ id, shiftId, nurseId, dateKey }),

		onMutate: ({ nurseId, dateKey, shiftId }) => {
			const store = useRosterStore.getState();
			const row = store.nurseRows.find((r) => r.nurse.id === nurseId);
			const assignment = row?.assignments[dateKey];

			const previousShiftType = assignment?.shiftType || "off";

			store.updateAssignment(
				nurseId,
				dateKey,
				shiftIdToShiftType(shiftId),
				previousShiftType,
			);

			return { previousShiftType };
		},

		onError: (_err, vars, context) => {
			if (context?.previousShiftType) {
				const store = useRosterStore.getState();
				const row = store.nurseRows.find((r) => r.nurse.id === vars.nurseId);
				const currentShiftType =
					row?.assignments[vars.dateKey]?.shiftType || "off";

				store.updateAssignment(
					vars.nurseId,
					vars.dateKey,
					context.previousShiftType,
					currentShiftType,
				);
			}
			toast.error("Failed to update shift");
		},

		onSuccess: () => {
			toast.success("Shift updated successfully");
		},
	});
}
