"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@Duty-Roster/ui/components/dropdown-menu";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { useRosterMonthName, useRosterStore } from "../store/use-roster-store";

interface RosterHeaderProps {
	onGenerate?: () => void;
	isGenerating?: boolean;
}

function getMonthOptions(): { year: number; month: number; label: string }[] {
	const options: { year: number; month: number; label: string }[] = [];
	const today = new Date();

	// Generate 12 months back and 12 months forward
	for (let offset = -12; offset <= 12; offset++) {
		const date = new Date(today.getFullYear(), today.getMonth() + offset, 1);
		options.push({
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			label: date.toLocaleDateString("en-US", {
				month: "long",
				year: "numeric",
			}),
		});
	}

	return options;
}

export function RosterHeader({
	onGenerate,
	isGenerating = false,
}: RosterHeaderProps) {
	const monthOptions = useMemo(() => getMonthOptions(), []);
	const {
		selectedMonth,
		goToPreviousMonth,
		goToNextMonth,
		goToCurrentMonth,
		changeMonth,
	} = useRosterStore();
	const monthName = useRosterMonthName();

	return (
		<div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
			<div className="flex flex-col gap-1">
				<h1 className="font-bold text-2xl text-slate-900 tracking-tight sm:text-3xl">
					Nurse Duty Roster
				</h1>
				<p className="text-slate-500 text-sm sm:text-base">
					Manage and view the master schedule for the nursing staff.
				</p>
			</div>

			<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 sm:w-full sm:gap-4 lg:justify-end">
					{onGenerate ? (
						<Button
							size="sm"
							className="flex-1 whitespace-nowrap text-sm sm:flex-initial sm:text-base"
							onClick={onGenerate}
							disabled={isGenerating}
						>
							{isGenerating ? "Generating..." : "Generate Schedule"}
						</Button>
					) : null}

					<div className="flex w-full items-center justify-between gap-2 md:w-auto">
						<Button
							variant="ghost"
							size="sm"
							className="text-sm sm:text-base"
							onClick={goToCurrentMonth}
						>
							Today
						</Button>

						{/* Month Navigation with Dropdown */}
						<div className="flex items-center gap-1 rounded-md border bg-white shadow-sm">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 sm:h-9 sm:w-9"
								onClick={goToPreviousMonth}
							>
								<ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger className="flex items-center gap-1 px-2 py-1 font-medium text-sm hover:bg-accent hover:text-accent-foreground sm:gap-2 sm:px-3 sm:py-2 sm:text-base">
									<span className="max-w-[100px] truncate sm:max-w-none">
										{monthName}
									</span>
									<ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
								</DropdownMenuTrigger>
								<DropdownMenuContent
									align="center"
									className="max-h-80 overflow-y-auto"
								>
									{monthOptions.map((option) => (
										<DropdownMenuItem
											key={`${option.year}-${option.month}`}
											onClick={() => changeMonth(option.year, option.month)}
											className={
												option.year === selectedMonth.year &&
												option.month === selectedMonth.month
													? "bg-accent"
													: ""
											}
										>
											{option.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>

							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 sm:h-9 sm:w-9"
								onClick={goToNextMonth}
							>
								<ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
