"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext } from "react";
import { trpcClient } from "@/utils/trpc";

export type ShiftDefinition = {
	id: string;
	name: "morning" | "evening" | "night";
	startTime: string;
	endTime: string;
	crossesMidnight: boolean;
};

export const ShiftDefinitionContext = createContext<ShiftDefinition[]>([]);

export function useShifts() {
	const { data: shiftsData } = useQuery({
		queryKey: ["shifts"],
		queryFn: () => trpcClient.roster.getShifts.query(),
	}) as {
		data?: ShiftDefinition[];
	};

	return shiftsData ?? [];
}
