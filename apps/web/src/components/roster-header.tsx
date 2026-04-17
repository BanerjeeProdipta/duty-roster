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

interface RosterHeaderProps {
	nurseCount: number;
	monthName: string;
	selectedMonth: { year: number; month: number };
	onPreviousMonth: () => void;
	onNextMonth: () => void;
	onCurrentMonth: () => void;
	onChangeMonth: (year: number, month: number) => void;
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
	monthName,
	selectedMonth,
	onPreviousMonth,
	onNextMonth,
	onCurrentMonth,
	onChangeMonth,
	onGenerate,
	isGenerating = false,
}: RosterHeaderProps) {
	const monthOptions = useMemo(() => getMonthOptions(), []);

	return (
		<div className="flex flex-col gap-4 border-b px-4 py-6 lg:flex-row lg:items-center lg:justify-between">
			<h1 className="font-bold text-lg tracking-tight lg:text-xl">
				Weekly Schedule
			</h1>
			<div className="flex items-center gap-4">
				{onGenerate ? (
					<Button
						size="sm"
						className="text-base"
						onClick={onGenerate}
						disabled={isGenerating}
					>
						{isGenerating ? "Generating..." : "Generate Schedule"}
					</Button>
				) : null}
				<Button
					variant="ghost"
					size="sm"
					className="text-base"
					onClick={onCurrentMonth}
				>
					Today
				</Button>

				{/* Month Navigation with Dropdown */}
				<div className="flex items-center gap-1 rounded-md border">
					<Button variant="ghost" size="icon" onClick={onPreviousMonth}>
						<ChevronLeft className="h-5 w-5" />
					</Button>

					<DropdownMenu>
						<DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-base hover:bg-accent hover:text-accent-foreground">
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
									onClick={() => onChangeMonth(option.year, option.month)}
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

					<Button variant="ghost" size="icon" onClick={onNextMonth}>
						<ChevronRight className="h-5 w-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
