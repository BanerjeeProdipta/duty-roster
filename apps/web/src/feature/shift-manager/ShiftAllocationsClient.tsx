"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { NurseCard } from "./components/NurseCard";
import { ShiftTotalsBar } from "./components/ShiftTotalsBar";
import { useShiftAllocations } from "./hooks/useShiftAllocations";

interface ShiftAllocationsClientProps {
	initialSchedules?: SchedulesResponse;
}

export default function ShiftAllocationsClient({
	initialSchedules,
}: ShiftAllocationsClientProps) {
	const { nurses, totalDays } = useShiftAllocations(initialSchedules);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex w-full flex-row items-center">
				<SearchInput placeholder="Search nurses..." className="w-full" />
				<ShiftTotalsBar nurses={nurses} />
			</div>

			<div className="grid flex-1 grid-cols-2 gap-4">
				{nurses.map((nurse) => (
					<NurseCard key={nurse.nurseId} nurse={nurse} totalDays={totalDays} />
				))}
			</div>
		</div>
	);
}
