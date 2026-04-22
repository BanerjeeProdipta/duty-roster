"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext } from "react";
import { QUERY_KEYS } from "@/utils/query-keys";
import { trpcClient } from "@/utils/trpc";

export type ShiftDefinition = {
	id: string;
	name: "morning" | "evening" | "night";
	startTime: string;
	endTime: string;
	crossesMidnight: boolean;
};

export const ShiftDefinitionContext = createContext<ShiftDefinition[]>([]);

const FALLBACK_SHIFTS: ShiftDefinition[] = [
	{
		id: "shift_morning",
		name: "morning",
		startTime: "08:00:00",
		endTime: "14:00:00",
		crossesMidnight: false,
	},
	{
		id: "shift_evening",
		name: "evening",
		startTime: "14:00:00",
		endTime: "20:00:00",
		crossesMidnight: false,
	},
	{
		id: "shift_night",
		name: "night",
		startTime: "20:00:00",
		endTime: "08:00:00",
		crossesMidnight: true,
	},
];

export function useShifts(): ShiftDefinition[] {
	const { data, isError } = useQuery<ShiftDefinition[]>({
		queryKey: QUERY_KEYS.shifts,
		queryFn: () => trpcClient.roster.getShifts.query(),
		initialData: FALLBACK_SHIFTS,
	});

	if (isError) return FALLBACK_SHIFTS;

	if (!data || data.length === 0) return FALLBACK_SHIFTS;

	return data;
}
