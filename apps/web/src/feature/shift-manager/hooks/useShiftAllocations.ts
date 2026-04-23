import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import type { SchedulesResponse } from "@/features/dashboard/components/roster-table/RosterMatrix.types";
import { useRosterStore } from "@/store/roster/useRosterStore";
import { getDaysInMonth } from "@/utils";
import type { NurseState } from "../types";

export function useShiftAllocations(initialSchedules?: SchedulesResponse) {
	const setInitialSchedules = useRosterStore((s) => s.setInitialSchedules);
	const nurseRowsFromStore = useRosterStore((s) => s.nurseRows);

	useEffect(() => {
		if (initialSchedules) setInitialSchedules(initialSchedules);
	}, [initialSchedules, setInitialSchedules]);

	const nurseRows =
		nurseRowsFromStore.length > 0
			? nurseRowsFromStore
			: (initialSchedules?.nurseRows ?? []);

	const searchParams = useSearchParams();
	const totalDaysParam = searchParams.get("days");
	const yearParam = searchParams.get("year");
	const monthParam = searchParams.get("month");
	const qParam = searchParams.get("q") ?? "";

	const now = new Date();
	const year = yearParam ? Number.parseInt(yearParam, 10) : now.getFullYear();
	const month = monthParam
		? Number.parseInt(monthParam, 10)
		: now.getMonth() + 1;
	const totalDays = totalDaysParam
		? Number.parseInt(totalDaysParam, 10)
		: getDaysInMonth(new Date(year, month - 1));

	const nurses: NurseState[] = nurseRows.map((row) => {
		const pref = row.preferenceWiseShiftMetrics;
		const assigned = pref.morning + pref.evening + pref.night;
		return {
			nurseId: row.nurse.id,
			name: row.nurse.name,
			morning: pref.morning,
			evening: pref.evening,
			night: pref.night,
			off: Math.max(0, totalDays - assigned),
			active: row.nurse.active ?? true,
		};
	});

	const filtered = qParam.trim()
		? nurses.filter((n) => n.name.toLowerCase().includes(qParam.toLowerCase()))
		: nurses;

	return { nurses: filtered, totalDays };
}
