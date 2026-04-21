"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";
import { LAYOUT } from "../components/roster-table/Layout";
import type { SchedulesResponse } from "../components/roster-table/RosterMatrix.types";

export function useRosterRows(initialSchedules: SchedulesResponse) {
	const { nurseRows } = initialSchedules;

	const parentRef = useRef<HTMLDivElement>(null);

	return useMemo(
		() => ({
			filteredNurseRows: nurseRows ?? [],
			parentRef,
		}),
		[nurseRows],
	);
}
