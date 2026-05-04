"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { Loader2, UserCheck, UserMinus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ShiftCountCard } from "@/features/dashboard/components/ShiftCountCard";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import {
	useFlexibilityMetrics,
	useSolverValidation,
} from "@/hooks/useSolverValidation";
import { NurseTable } from "./components/NurseTable/NurseTable";
import { SolverWarnings } from "./components/SolverWarnings";
import { useShiftCounts } from "./hooks/useShiftCounts";

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

	// Sync nurseRows when query refetches (e.g. after prefill)
	useEffect(() => {
		setNurseRows(initialNurseRows);
	}, [initialNurseRows]);

	// Extracted logic hooks
	const { solverValidation, shiftDeficits, showExactMatchWarning } =
		useSolverValidation({
			nurseRows,
			totalDays,
			shiftRequirements: initialSchedules?.shiftRequirements ?? {
				morning: 0,
				evening: 0,
				night: 0,
				total: 0,
			},
		});

	const shiftCounts = useShiftCounts({
		nurseRows,
		nurses,
		shiftRequirements: initialSchedules?.shiftRequirements,
	});

	const flexibilityMetrics = useFlexibilityMetrics({
		shiftRequirements: initialSchedules?.shiftRequirements,
		shiftCounts: {
			morning: {
				required: shiftCounts.morning.required,
				preference: shiftCounts.morning.preference,
			},
			evening: {
				required: shiftCounts.evening.required,
				preference: shiftCounts.evening.preference,
			},
			night: {
				required: shiftCounts.night.required,
				preference: shiftCounts.night.preference,
			},
		},
		totalDays,
		nurses,
		nurseRows,
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

	return (
		<div className="flex flex-col gap-4">
			<SolverWarnings
				solverValidation={solverValidation}
				totalDays={totalDays}
				shiftDeficits={shiftDeficits}
				showExactMatchWarning={showExactMatchWarning}
				flexibilityMetrics={flexibilityMetrics}
			/>

			{/* Shift Count Cards */}
			<div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
					<ShiftCountCard
						shift="total"
						required={shiftCounts.total.required}
						preference={shiftCounts.total.preference}
					/>
					<ShiftCountCard
						shift="morning"
						required={shiftCounts.morning.required}
						preference={shiftCounts.morning.preference}
					/>
					<ShiftCountCard
						shift="evening"
						required={shiftCounts.evening.required}
						preference={shiftCounts.evening.preference}
					/>
					<ShiftCountCard
						shift="night"
						required={shiftCounts.night.required}
						preference={shiftCounts.night.preference}
					/>
				</div>
			</div>

			{/* Search Bar + Nurse Totals */}
			<div className="flex w-full flex-col items-center justify-between sm:flex-row sm:gap-4">
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
