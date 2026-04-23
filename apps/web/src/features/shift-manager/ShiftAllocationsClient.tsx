"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { Loader2 } from "lucide-react";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import { NurseCard } from "./components/NurseCard";
import { ShiftTotalsBar } from "./components/ShiftTotalsBar";
import { useShiftAllocations } from "./hooks/useShiftAllocations";

interface ShiftAllocationsClientProps {
	initialSchedules?: SchedulesResponse;
}

export default function ShiftAllocationsClient({
	initialSchedules,
}: ShiftAllocationsClientProps) {
	const { schedules, isFetching, totalDays, nurses } =
		useScheduleInit(initialSchedules);

	const showLoader = isFetching && !nurses.length;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex w-full flex-row items-center">
				<SearchInput placeholder="Search nurses..." className="w-full" />
				<ShiftTotalsBar nurses={nurses} />
			</div>

			{showLoader && (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
				</div>
			)}

			<div className="grid flex-1 grid-cols-2 gap-4">
				{nurses.map((nurse) => (
					<NurseCard key={nurse.nurseId} nurse={nurse} totalDays={totalDays} />
				))}
			</div>
		</div>
	);
}
