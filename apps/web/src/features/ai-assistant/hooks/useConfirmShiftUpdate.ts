"use client";

import { useCallback } from "react";
import { useUpdateShift } from "@/hooks/useUpdateShift";
import { trpcClient } from "@/utils/trpc";

interface PendingConfirmation {
	nurseName: string;
	englishName: string | null;
	shift: string;
	date: string;
}

export function useConfirmShiftUpdate() {
	const updateShift = useUpdateShift();

	const convertDateToDateKey = useCallback((dateStr: string): string => {
		const months: Record<string, string> = {
			january: "01",
			february: "02",
			march: "03",
			april: "04",
			may: "05",
			june: "06",
			july: "07",
			august: "08",
			september: "09",
			october: "10",
			november: "11",
			december: "12",
		};
		const match = dateStr.toLowerCase().match(/(\w+)\s+(\d+)/);
		if (!match) return "";
		const month = months[match[1]!];
		const day = match[2]?.padStart(2, "0");
		const year = new Date().getFullYear();
		return `${year}-${month}-${day}`;
	}, []);

	const confirmShiftUpdate = useCallback(
		(pending: PendingConfirmation) => {
			const dateKey = convertDateToDateKey(pending.date);
			const shiftId = pending.shift === "off" ? null : `shift_${pending.shift}`;

			trpcClient.roster.getSchedules
				.query({
					startDate: dateKey,
					endDate: dateKey,
				})
				.then((response) => {
					for (const nurseRow of response.nurseRows) {
						if (nurseRow.nurse.name === pending.nurseName) {
							const assignment = nurseRow.assignments[dateKey];
							if (assignment) {
								updateShift.mutate({
									id: assignment.id,
									shiftId,
									nurseId: nurseRow.nurse.id,
									dateKey,
								});
							}
							break;
						}
					}
				});
		},
		[convertDateToDateKey, updateShift],
	);

	return { confirmShiftUpdate };
}
