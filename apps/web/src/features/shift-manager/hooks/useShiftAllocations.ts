import { useSearchParams } from "next/navigation";
import type { SchedulesResponse } from "@/features/dashboard/roster-table/RosterMatrix.types";
import { useYearMonth } from "@/hooks/useYearMonth";
import { getDaysInMonth } from "@/utils";
import type { NurseState } from "../types";

export function useShiftAllocations(
	schedules?: SchedulesResponse,
	externalTotalDays?: number,
) {
	const nurseRows = schedules?.nurseRows ?? [];

	const { year, month } = useYearMonth();
	const searchParams = useSearchParams();
	const qParam = searchParams.get("q") ?? "";

	const totalDays =
		externalTotalDays ?? getDaysInMonth(new Date(year, month - 1));

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
