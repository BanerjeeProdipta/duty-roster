"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useGenerateRoster } from "@/hooks/useGenerateRoster";
import { useRosterHeader } from "@/hooks/useRosterHeader";

type RosterHeaderProps = {
	editable?: boolean;
};

export function RosterHeader({ editable = false }: RosterHeaderProps) {
	const { selectedMonth, monthName, goToPreviousMonth, goToNextMonth } =
		useRosterHeader();

	const generateMutation = useGenerateRoster();

	return (
		<div className="flex items-center justify-between gap-4">
			<div className="flex items-center gap-2">
				<Button variant="ghost" size="icon" onClick={goToPreviousMonth}>
					<ChevronLeft className="h-4 w-4" />
				</Button>
				<span className="min-w-[120px] text-center font-medium text-slate-900">
					{monthName}
				</span>
				<Button variant="ghost" size="icon" onClick={goToNextMonth}>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>

			{editable && (
				<Button
					size="sm"
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
	);
}
