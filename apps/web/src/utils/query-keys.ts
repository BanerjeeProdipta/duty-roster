export const QUERY_KEYS = {
	roster: (startDate: string, endDate: string) =>
		["roster", startDate, endDate] as const,
	rosterBase: ["roster"] as const,
	shifts: ["shifts"] as const,
	shiftRequirements: (year: number, month: number) =>
		["shiftRequirements", year, month] as const,
} as const;
