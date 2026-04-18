"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@Duty-Roster/ui/components/dropdown-menu";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useGenerateRoster } from "@/hooks/useGenerateRoster";
import { useRosterHeader } from "@/hooks/useRosterHeader";

type RosterHeaderProps = {
	editable?: boolean;
};

export function RosterHeader({ editable = false }: RosterHeaderProps) {
	const {
		selectedMonth,
		monthName,
		monthOptions,
		goToPreviousMonth,
		goToNextMonth,
		goToCurrentMonth,
		changeMonth,
	} = useRosterHeader();

	const generateMutation = useGenerateRoster();

	return (
		<div className="mb-8 flex animate-fade-in flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
			{/* Title */}
			<div className="flex animate-slide-up flex-col gap-1">
				<h1 className="font-bold text-3xl text-slate-900 tracking-tight sm:text-4xl">
					Nurse Duty Roster
				</h1>
				<p className="max-w-md text-slate-500 text-sm leading-relaxed sm:text-base">
					Professional scheduling management with real-time coverage analytics
					and nurse preference alignment.
				</p>
			</div>

			{/* Controls */}
			<div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex w-full flex-row flex-wrap items-center justify-between gap-2 sm:gap-4 lg:justify-end">
					{/* Generate Button */}
					{editable && (
						<Button
							size="sm"
							className="flex-1 whitespace-nowrap text-sm sm:flex-initial sm:text-base"
							onClick={() =>
								generateMutation.mutate({
									year: selectedMonth.year,
									month: selectedMonth.month,
								})
							}
							disabled={generateMutation.isPending}
						>
							{generateMutation.isPending
								? "Generating..."
								: "Generate Schedule"}
						</Button>
					)}

					{/* Navigation */}
					<div className="flex w-full items-center justify-between gap-4 md:w-auto">
						<Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
							Today
						</Button>

						<div className="flex items-center gap-1 rounded-md border bg-white shadow-sm">
							{/* Previous */}
							<Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
								<ChevronLeft className="h-4 w-4" />
							</Button>

							{/* Month Dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger className="flex items-center gap-2 px-3 py-2 font-medium text-sm">
									{monthName}
									<ChevronDown className="h-4 w-4" />
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

							{/* Next */}
							<Button variant="ghost" size="icon" onClick={goToNextMonth}>
								<ChevronRight className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
