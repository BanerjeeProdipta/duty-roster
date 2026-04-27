"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { useSchedules } from "@/hooks/useSchedules";
import { ShiftCountCard } from "./ShiftCountCard";
import { ShiftCountsSkeleton } from "./ShiftCountsSkeleton";

type ShiftCountsProps = {
	initialSchedules?: SchedulesResponse;
};

export function ShiftCounts({ initialSchedules }: ShiftCountsProps) {
	const { schedules, isLoading } = useSchedules(initialSchedules);

	if (isLoading) {
		return <ShiftCountsSkeleton />;
	}

	const schedulesData = schedules ?? initialSchedules;
	const { shiftRequirements, assignedShiftCounts, preferenceCapacity } =
		schedulesData ?? {};

	return (
		<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
				<ShiftCountCard
					shift="total"
					required={shiftRequirements?.total ?? 0}
					assigned={
						(assignedShiftCounts?.morning ?? 0) +
						(assignedShiftCounts?.evening ?? 0) +
						(assignedShiftCounts?.night ?? 0)
					}
					capacity={
						(preferenceCapacity?.morning ?? 0) +
						(preferenceCapacity?.evening ?? 0) +
						(preferenceCapacity?.night ?? 0)
					}
				/>
				<ShiftCountCard
					shift="morning"
					required={shiftRequirements?.morning ?? 0}
					assigned={assignedShiftCounts?.morning ?? 0}
					capacity={preferenceCapacity?.morning ?? 0}
				/>
				<ShiftCountCard
					shift="evening"
					required={shiftRequirements?.evening ?? 0}
					assigned={assignedShiftCounts?.evening ?? 0}
					capacity={preferenceCapacity?.evening ?? 0}
				/>
				<ShiftCountCard
					shift="night"
					required={shiftRequirements?.night ?? 0}
					assigned={assignedShiftCounts?.night ?? 0}
					capacity={preferenceCapacity?.night ?? 0}
				/>
			</div>
		</div>
	);
}
