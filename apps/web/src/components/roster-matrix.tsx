"use client";

import { Card, CardContent } from "@Duty-Roster/ui/components/card";
import { RosterHeader } from "./roster-header";
import { NURSES } from "./roster-matrix.constants";
import { RosterTable } from "./roster-table";
import { useRosterState } from "./use-roster-state";

export function RosterMatrix({ editable = false }: { editable?: boolean }) {
	const { setWeekOffset, weekDates, shiftMap, updateShift } = useRosterState();

	return (
		<div className="flex flex-col gap-6">
			<Card className="w-full overflow-hidden">
				<RosterHeader
					nurseCount={NURSES.length}
					weekDates={weekDates}
					setWeekOffset={setWeekOffset}
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
