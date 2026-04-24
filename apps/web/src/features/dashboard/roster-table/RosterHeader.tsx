"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { FileText } from "lucide-react";
import Link from "next/link";
import { MonthNavigator } from "@/components/MonthNavigator";
import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { useGenerateRoster } from "@/hooks/useGenerateRoster";
import { useRosterHeader } from "@/hooks/useRosterHeader";

type RosterHeaderProps = {
	editable?: boolean;
	initialSchedules?: SchedulesResponse | null;
};

export function RosterHeader({
	editable = false,
	initialSchedules,
}: RosterHeaderProps) {
	const { selectedMonth } = useRosterHeader();
	const generateMutation = useGenerateRoster();
	const nurseNames =
		initialSchedules?.nurseRows.map((row) => row.nurse.name) ?? [];
	const nurseCount = nurseNames.length;

	console.log({ initialSchedules });
	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<SearchInput
				paramKey="q"
				language="bn-BD"
				placeholder="নার্সের নাম দিয়ে খুঁজুন..."
				suggestions={nurseNames}
				suggestionCount={nurseCount}
			/>
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-4">
					<Link
						href={`/roster?year=${selectedMonth.year}&month=${selectedMonth.month}`}
						className="flex items-center gap-2 whitespace-nowrap rounded-lg border bg-slate-50 px-3 py-2.5 font-medium text-sm transition-colors hover:bg-slate-200"
					>
						<FileText className="h-4 w-4" />
						View & Print Roster
					</Link>
					{editable && (
						<Button
							variant="secondary"
							className="border border-gray-200 bg-gray-100 text-sm"
							onClick={() =>
								generateMutation.mutate({
									year: selectedMonth.year,
									month: selectedMonth.month,
								})
							}
							disabled={generateMutation.isPending}
						>
							{generateMutation.isPending ? "Generating..." : "Generate"}
						</Button>
					)}
				</div>
				<MonthNavigator />
			</div>
		</div>
	);
}
