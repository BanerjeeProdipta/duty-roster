"use client";

import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { useSearchParams } from "next/navigation";
import { FormSummary } from "./FormSummary";
import { NurseList } from "./NurseList";
import type { NurseData, NurseState } from "./types";
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
	const searchParams = useSearchParams();
	const highlightName = searchParams.get("n") ?? "";

	const { totalDays, form } = useShiftAllocations({
		initialData,
		year,
		month,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex w-full flex-col items-center gap-3 lg:flex-row">
				<SearchInput placeholder="Search nurses..." className="w-full" />

				<div className="shrink-0">
					<FormSummary form={form} totalDays={totalDays} capacity={capacity} />
				</div>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex-1"
			>
				<NurseList
					form={form}
					totalDays={totalDays}
					highlightName={highlightName}
				/>
			</form>
		</div>
	);
}
