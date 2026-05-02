"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
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

	// Warning: req === pref AND nurses have inconsistent off days
	const showExactMatchWarning = useMemo(() => {
		// Check 1: req === pref (exact match on totals)
		const reqTotal = initialSchedules?.shiftRequirements?.total ?? 0;
		const prefTotal = initialSchedules?.preferenceCapacity?.total ?? 0;
		if (reqTotal !== prefTotal) return false;

		// Check 2: Nurses have inconsistent off days
		const activeNurseRows = nurseRows.filter((row) => row.nurse.active);
		if (activeNurseRows.length === 0) return false;

		// Calculate off days for each nurse: totalDays - (morning + evening + night)
		const offDaysByNurse = activeNurseRows.map((row) => {
			const metrics = row.preferenceWiseShiftMetrics;
			const worked =
				(metrics.morning ?? 0) + (metrics.evening ?? 0) + (metrics.night ?? 0);
			return totalDays - worked;
		});

		// Check if all off day counts are the same
		const uniqueOffCounts = new Set(offDaysByNurse);
		return uniqueOffCounts.size > 1;
	}, [initialSchedules, nurseRows, totalDays]);

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
			{/* Warning alert for exact match + inconsistent off days */}
			{showExactMatchWarning && (
				<div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
					<AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
					<div>
						<h4 className="font-semibold text-rose-700">Exact Match Warning</h4>
						<p className="mt-1 text-rose-700 text-xs">
							Required equals preferred, but nurses have inconsistent off days.
							This may cause the solver to fail. Consider equalizing off days
							across nurses.
						</p>
					</div>
				</div>
			)}

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
