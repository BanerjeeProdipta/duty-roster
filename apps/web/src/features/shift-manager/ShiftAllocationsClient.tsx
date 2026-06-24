"use client";

import type { SchedulesResponse } from "@Duty-Roster/api";
import { Pagination } from "@Duty-Roster/ui/components/pagination";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { Loader2, UserCheck, UserMinus } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ShiftCountCard } from "@/features/dashboard/components/ShiftCountCard";
import { useScheduleInit } from "@/hooks/useScheduleInit";
import {
	useFlexibilityMetrics,
	useSolverValidation,
} from "@/hooks/useSolverValidation";
import { trpcClient } from "@/utils/trpc";
import { NurseTable } from "./components/NurseTable/NurseTable";
import { useShiftCounts } from "./hooks/useShiftCounts";

// ~12 kB component only needed when solver validation has issues.
// Lazy-loading keeps it out of the initial dashboard bundle.
const SolverWarnings = dynamic(
	() =>
		import("./components/SolverWarnings").then((m) => ({
			default: m.SolverWarnings,
		})),
	{ ssr: false },
);

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
		page,
		pageSize,
		pagination,
		setPage,
		setPageSize,
		schedules: refetchedSchedules,
	} = useScheduleInit(initialSchedules);

	const searchParams = useSearchParams();
	const router = useRouter();

	const [nurseRows, setNurseRows] =
		useState<SchedulesResponse["nurseRows"]>(initialNurseRows);
	const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
	const [suggestions, setSuggestions] = useState<string[]>([]);
	const [language, setLanguage] = useState<"en-US" | "bn-BD">("bn-BD");

	const handleSearch = useCallback(
		(value: string) => {
			setSearchTerm(value);
			const params = new URLSearchParams(searchParams.toString());
			if (value) {
				params.set("q", value);
			} else {
				params.delete("q");
			}
			router.replace(`?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	useEffect(() => {
		if (searchTerm.length === 0) {
			setSuggestions([]);
			return;
		}
		const timer = setTimeout(async () => {
			try {
				const result = await trpcClient.roster.searchNurseNames.query({
					q: searchTerm,
				});
				setSuggestions(result.map((n) => n.name));
			} catch {
				// ignore fetch errors
			}
		}, 200);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	// Sync nurseRows when query refetches (e.g. after prefill)
	useEffect(() => {
		setNurseRows(initialNurseRows);
	}, [initialNurseRows]);

	// Extracted logic hooks
	const { solverValidation, shiftDeficits, showExactMatchWarning } =
		useSolverValidation({
			nurseRows,
			totalDays,
			shiftRequirements: refetchedSchedules?.shiftRequirements ?? {
				morning: 0,
				evening: 0,
				night: 0,
				total: 0,
			},
			preferenceCapacity: refetchedSchedules?.preferenceCapacity,
			nurseCounts: refetchedSchedules?.nurseCounts,
		});

	const shiftCounts = useShiftCounts({
		nurseRows,
		initialNurseRows,
		nurses,
		shiftRequirements: refetchedSchedules?.shiftRequirements,
		preferenceCapacity: refetchedSchedules?.preferenceCapacity,
		adjustedPreferenceCapacity: refetchedSchedules?.adjustedPreferenceCapacity,
		nurseCounts: refetchedSchedules?.nurseCounts,
	});

	const flexibilityMetrics = useFlexibilityMetrics({
		shiftRequirements: refetchedSchedules?.shiftRequirements,
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
		preferenceCapacity: refetchedSchedules?.preferenceCapacity,
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
					value={searchTerm}
					onChange={setSearchTerm}
					onSearch={handleSearch}
					suggestions={suggestions}
					language={language}
					onLanguageChange={(lang) => setLanguage(lang)}
					className="w-full"
				/>
				<div className="flex items-center justify-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
					<div className="inline-flex items-center gap-1 font-medium text-emerald-600 text-sm">
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
					<Loader2 className="h-6 w-6 animate-spin text-gray-400" />
				</div>
			)}

			{!showLoader && (
				<>
					<NurseTable
						nurses={filteredNurses}
						totalDays={totalDays}
						onShiftChange={handleShiftChange}
						onActiveChange={handleActiveChange}
					/>
					{pagination && (
						<Pagination
							page={page}
							pageSize={pageSize}
							totalPages={pagination.totalPages}
							onPageChange={setPage}
							onPageSizeChange={setPageSize}
						/>
					)}
				</>
			)}
		</div>
	);
}
