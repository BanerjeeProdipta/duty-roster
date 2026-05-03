"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { Loader2, UserCheck, UserMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ShiftCountCard } from "@/features/dashboard/components/ShiftCountCard";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import { NurseTable } from "./components/NurseTable/NurseTable";
import { SolverWarnings } from "./components/SolverWarnings";
import { useShiftCounts } from "./hooks/useShiftCounts";
import { useSolverValidation } from "./hooks/useSolverValidation";

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
		year,
		month,
	} = useScheduleInit(initialSchedules);

	const [nurseRows, setNurseRows] =
		useState<SchedulesResponse["nurseRows"]>(initialNurseRows);
	const [searchTerm, setSearchTerm] = useState("");
	const [language, setLanguage] = useState<"en-US" | "bn-BD">("bn-BD");

	// Sync nurseRows when query refetches (e.g. after prefill)
	useEffect(() => {
		setNurseRows(initialNurseRows);
	}, [initialNurseRows]);

	// Extracted logic hooks
	const { solverValidation, shiftDeficits, showExactMatchWarning } =
		useSolverValidation({
			nurseRows,
			totalDays,
			shiftRequirements: initialSchedules?.shiftRequirements,
		});

	const shiftCounts = useShiftCounts({
		nurseRows,
		nurses,
		shiftRequirements: initialSchedules?.shiftRequirements,
	});

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

	const totalAvailable =
		(shiftCounts.morning.available ?? 0) +
		(shiftCounts.evening.available ?? 0) +
		(shiftCounts.night.available ?? 0);

	return (
		<div className="flex flex-col gap-4">
			<SolverWarnings
				solverValidation={solverValidation}
				totalDays={totalDays}
				shiftDeficits={shiftDeficits}
				showExactMatchWarning={showExactMatchWarning}
				year={year}
				month={month}
				nurseRows={nurseRows}
			/>

			{/* Shift Count Cards */}
			<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
					<ShiftCountCard
						shift="total"
						required={shiftCounts.total.required}
						preference={shiftCounts.total.preference}
						available={totalAvailable}
					/>
					<ShiftCountCard
						shift="morning"
						required={shiftCounts.morning.required}
						preference={shiftCounts.morning.preference}
						available={shiftCounts.morning.available}
					/>
					<ShiftCountCard
						shift="evening"
						required={shiftCounts.evening.required}
						preference={shiftCounts.evening.preference}
						available={shiftCounts.evening.available}
					/>
					<ShiftCountCard
						shift="night"
						required={shiftCounts.night.required}
						preference={shiftCounts.night.preference}
						available={shiftCounts.night.available}
					/>
				</div>
			</div>

			{/* Search Bar + Nurse Totals */}
			<div className="flex w-full flex-col items-center gap-4 lg:flex-row">
				<SearchInput
					placeholder={language === "bn-BD" ? "নার্স খুঁজুন..." : "Search nurses..."}
					onSearch={setSearchTerm}
					language={language}
					onLanguageChange={(lang) => setLanguage(lang)}
					className="w-full"
				/>
				<div className="flex items-center justify-center gap-4 rounded-lg bg-slate-50 px-4 py-3">
					<div className="inline-flex items-center gap-1 font-medium text-green-600 text-sm">
						<UserCheck className="h-4 w-4" />
						{shiftCounts.activeCount}
					</div>
					<div className="inline-flex items-center gap-1 font-medium text-rose-400 text-sm">
						<UserMinus className="h-4 w-4" />
						{shiftCounts.inactiveCount}
					</div>
				</div>
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
