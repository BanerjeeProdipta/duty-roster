"use client";

import { Button } from "@Duty-Roster/ui/components/button";
import { MonthNavigator } from "@/components/MonthNavigator";
import { useGenerateRoster } from "@/hooks/useGenerateRoster";
import { useRosterHeader } from "@/hooks/useRosterHeader";
import { DownloadCSVButton } from "../components/DownloadCSVButton";

type RosterHeaderProps = {
	editable?: boolean;
};

export function RosterHeader({ editable = false }: RosterHeaderProps) {
	const { selectedMonth } = useRosterHeader();
	const generateMutation = useGenerateRoster();

	return (
		<div className="flex items-center justify-between gap-4">
			<MonthNavigator />

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
			<DownloadCSVButton />
		</div>
	);
}
