"use client";

import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { FormSummary } from "./FormSummary";
import { NurseList } from "./NurseList";
import type { NurseData } from "./types";
import { useShiftAllocations } from "./useShiftAllocations";

interface ShiftAllocationsClientProps {
	initialData: NurseData[];
	year?: number;
	month?: number;
	capacity?: {
		morning: number;
		evening: number;
		night: number;
		total: number;
	};
}

export default function ShiftAllocationsClient({
	initialData,
	year,
	month,
	capacity,
}: ShiftAllocationsClientProps) {
	const { form, totalDays, filteredData } = useShiftAllocations({
		initialData,
		year,
		month,
	});
	const nurses = filteredData;

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				e.stopPropagation();
				form.handleSubmit();
			}}
		>
			<div className="flex flex-col gap-4">
				<div className="flex w-full flex-col items-center gap-3 lg:flex-row">
					<SearchInput placeholder="Search nurses..." className="w-full" />

					<div className="shrink-0">
						<FormSummary
							nurses={nurses}
							totalDays={totalDays}
							capacity={capacity}
						/>
					</div>
				</div>

				<div className="flex-1">
					<NurseList nurses={nurses} totalDays={totalDays} />
				</div>
			</div>
		</form>
	);
}
