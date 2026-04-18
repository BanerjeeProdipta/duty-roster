import { cn } from "@Duty-Roster/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import React, { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { trpcClient } from "@/utils/trpc";
import { useRosterStore } from "../../store/use-roster-store";
import type { ShiftType } from "../roster-matrix.types";
import { ShiftBadge } from "../shift-dropdown";
import { LAYOUT } from "./constants";

interface NurseRowProps {
	nurse: { id: string; name: string };
	dates: {
		date: Date;
		key: number;
		isToday: boolean;
		shortLabel: string;
		formatted: string;
		label: string;
	}[];
}

export const NurseRow = React.memo(function NurseRow({
	nurse,
	dates,
}: NurseRowProps) {
	const { editable, updateShift, shifts } = useRosterStore();

	const nurseShifts = useMemo(
		() => shifts.filter((sh) => sh.employeeId === nurse.id),
		[shifts, nurse.id],
	);

	const shiftMapByDate = useMemo(
		() => new Map(nurseShifts.map((sh) => [sh.date, sh])),
		[nurseShifts],
	);

	const updateMutation = useMutation({
		mutationFn: async ({
			id,
			dateStr,
			newType,
		}: {
			id: string;
			dateStr: string;
			newType: ShiftType;
		}) => {
			return trpcClient.roster.updateShift.mutate({
				id,
				shiftId: newType === "off" ? null : `shift_${newType}`,
			});
		},
		onSuccess: (_, variables) => {
			toast.success(
				`Shift updated for ${nurse.name} on ${variables.dateStr} to ${variables.newType}`,
			);
		},
		onError: (err, variables) => {
			console.error("Failed to update shift:", err);
			toast.error(`Failed to update ${nurse.name}'s shift`);
		},
	});

	const handleChange = useCallback(
		(date: Date, scheduleId?: string) => (newType: ShiftType) => {
			const dateStr = date.toISOString().split("T")[0];

			if (!scheduleId) {
				console.error("Cannot update shift: scheduleId is missing", {
					nurseId: nurse.id,
					date: dateStr,
					newType,
				});
				toast.error("Internal Error: Missing schedule ID. Please refresh.");
				return;
			}

			// Optimistically update store
			updateShift(nurse.name, dateStr, newType);

			// Trigger API call
			updateMutation.mutate({ id: scheduleId, dateStr, newType });
		},
		[nurse.id, nurse.name, updateShift, updateMutation],
	);

	return (
		<div className="flex h-full w-full">
			{dates.map((d) => {
				const dateKey = d.date.toISOString().split("T")[0];
				const shift = shiftMapByDate.get(dateKey);

				return (
					<div
						key={d.key}
						className={cn(
							"flex items-center justify-center border-b px-2 text-center transition-colors",
							d.isToday ? "bg-slate-50" : "hover:bg-slate-50/50",
						)}
						style={{
							flex: `0 0 ${LAYOUT.cellWidth}`,
							width: LAYOUT.cellWidth,
							height: LAYOUT.cellHeight,
						}}
					>
						{shift && (
							<ShiftBadge
								type={shift.shiftType}
								nurseName={nurse.name}
								date={d.shortLabel}
								onChange={editable ? handleChange(d.date, shift.id) : undefined}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
});
