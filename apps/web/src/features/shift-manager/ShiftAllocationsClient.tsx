"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import { NurseShiftCounts } from "./components/NurseShiftCounts";
import { NurseTable } from "./components/NurseTable/NurseTable";
import { ShiftTotalsBar } from "./components/ShiftTotalsBar";

interface ShiftAllocationsClientProps {
	initialSchedules?: SchedulesResponse;
}

export default function ShiftAllocationsClient({
	initialSchedules,
}: ShiftAllocationsClientProps) {
	const {
		isFetching,
		totalDays,
		nurses,
		nurseRows: initialNurseRows,
	} = useScheduleInit(initialSchedules);
	const [nurseRows, setNurseRows] =
		useState<SchedulesResponse["nurseRows"]>(initialNurseRows);
	const [searchTerm, setSearchTerm] = useState("");
	const [language, setLanguage] = useState<"en-US" | "bn-BD">("bn-BD");

	const showLoader = isFetching && !nurses.length;

	const filteredNurses = searchTerm
		? nurses.filter((nurse) =>
				nurse.name.toLowerCase().includes(searchTerm.toLowerCase()),
			)
		: nurses;

	const handleShiftChange = useCallback(
		(nurseId: string, morning: number, evening: number, night: number) => {
			setNurseRows((prev) =>
				prev.map((row) => {
					if (row.nurse.id !== nurseId) return row;
					return {
						...row,
						preferenceWiseShiftMetrics: {
							morning,
							evening,
							night,
							total: morning + evening + night,
						},
					};
				}),
			);
		},
		[],
	);

	const handleActiveChange = useCallback((nurseId: string, active: boolean) => {
		setNurseRows((prev) =>
			prev.map((row) => {
				if (row.nurse.id !== nurseId) return row;
				return {
					...row,
					nurse: { ...row.nurse, active },
				};
			}),
		);
	}, []);

	return (
		<div className="flex flex-col gap-4">
			<NurseShiftCounts
				nurseRows={nurseRows}
				shiftRequirements={initialSchedules?.shiftRequirements}
			/>

			<div className="flex w-full flex-col items-center gap-4 lg:flex-row">
				<SearchInput
					placeholder={language === "bn-BD" ? "নার্স খুঁজুন..." : "Search nurses..."}
					onSearch={setSearchTerm}
					language={language}
					onLanguageChange={(lang) => setLanguage(lang)}
					className="w-full"
				/>
				<ShiftTotalsBar nurses={nurses} />
			</div>

			{showLoader && (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
				</div>
			)}

			{!showLoader && (
				<NurseTable
					nurses={filteredNurses}
					totalDays={totalDays}
					onShiftChange={handleShiftChange}
					onActiveChange={handleActiveChange}
				/>
			)}
		</div>
	);
}
