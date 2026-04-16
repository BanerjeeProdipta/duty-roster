"use client";

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
			className={`flex flex-1 flex-col transition-opacity duration-150 ${
				isWeekTransitioning ? "opacity-95" : "opacity-100"
			}`}
		>
			<RosterHeader
				nurseCount={NURSES.length}
				weekDates={weekDates}
				onPreviousWeek={goToPreviousWeek}
				onNextWeek={goToNextWeek}
				onCurrentWeek={goToCurrentWeek}
			/>
			<RosterTable
				weekDates={weekDates}
				shiftMap={shiftMap}
				editable={editable}
				onShiftChange={updateShift}
			/>
		</div>
	);
}
