"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { SearchInput } from "@Duty-Roster/ui/components/search-input";
import { FileText, Settings } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { MonthNavigator } from "@/components/MonthNavigator";
import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { useGenerateRoster } from "@/hooks/useGenerateRoster";
import { useRosterHeader } from "@/hooks/useRosterHeader";

const MotionSettings = motion(Settings);
const MotionFileText = motion(FileText);

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

	const searchParams = useSearchParams();
	const router = useRouter();
	const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

	useEffect(() => {
		setSearchValue(searchParams.get("q") ?? "");
	}, [searchParams]);

	const handleSearch = (value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value) {
			params.set("q", value);
		} else {
			params.delete("q");
		}
		router.push(`?${params.toString()}`, { scroll: false });
	};

	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<SearchInput
				value={searchValue}
				onChange={setSearchValue}
				onSearch={handleSearch}
				placeholder="নার্সের নাম দিয়ে খুঁজুন..."
				suggestions={nurseNames}
				suggestionCount={nurseCount}
			/>
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-4">
					<Link
						href={`/roster?year=${selectedMonth.year}&month=${selectedMonth.month}`}
						className="flex items-center gap-2 whitespace-nowrap rounded-lg border bg-accent-primary-light px-3 py-2.5 font-medium text-indigo-700 text-sm transition-colors hover:bg-accent-primary hover:text-muted"
					>
						<MotionFileText
							className="h-4 w-4"
							whileHover={{ scale: 1.2, rotate: 10 }}
							transition={{ type: "spring", stiffness: 400, damping: 10 }}
						/>
						View & Print Roster
					</Link>
					{editable && (
						<Button
							variant="secondary"
							className="border border-gray-200 bg-lime-100 px-3 py-2.5 text-lime-900 text-sm transition-colors hover:bg-lime-500 hover:text-muted"
							onClick={() =>
								generateMutation.mutate({
									year: selectedMonth.year,
									month: selectedMonth.month,
								})
							}
							disabled={generateMutation.isPending}
						>
							<MotionSettings
								className="h-4 w-4"
								animate={
									generateMutation.isPending ? { rotate: 360 } : { rotate: 0 }
								}
								transition={
									generateMutation.isPending
										? {
												repeat: Number.POSITIVE_INFINITY,
												duration: 2,
												ease: "linear",
											}
										: { duration: 0.3 }
								}
								whileHover={
									!generateMutation.isPending
										? {
												rotate: [0, 180, 180, 360],
												transition: {
													duration: 1.5,
													repeat: Number.POSITIVE_INFINITY,
													times: [0, 0.4, 0.6, 1],
													ease: "easeInOut",
												},
											}
										: {}
								}
							/>
							{generateMutation.isPending ? "Generating..." : "Generate"}
						</Button>
					)}
				</div>
				<MonthNavigator />
			</div>
		</div>
	);
}
