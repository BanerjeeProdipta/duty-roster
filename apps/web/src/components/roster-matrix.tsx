"use client";

import { Card, CardContent } from "@Duty-Roster/ui/components/card";
import { RosterHeader } from "./roster-header";
import { NURSES } from "./roster-matrix.constants";
import { RosterTable } from "./roster-table";
import { useRosterState } from "./use-roster-state";

export function RosterMatrix({ editable = false }: { editable?: boolean }) {
	const {
		weekDates,
		shiftMap,
		updateShift,
		isWeekTransitioning,
		goToPreviousWeek,
		goToNextWeek,
		goToCurrentWeek,
	} = useRosterState();

	return (
		<div
			className={`m-2 flex flex-col gap-6 transition-opacity duration-150 ${
				isWeekTransitioning ? "opacity-95" : "opacity-100"
			}`}
		>
			<Card className="w-full rounded-md">
				<RosterHeader
					nurseCount={NURSES.length}
					weekDates={weekDates}
					onPreviousWeek={goToPreviousWeek}
					onNextWeek={goToNextWeek}
					onCurrentWeek={goToCurrentWeek}
				/>
				<CardContent className="p-0">
					<RosterTable
						weekDates={weekDates}
						shiftMap={shiftMap}
						editable={editable}
						onShiftChange={updateShift}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
