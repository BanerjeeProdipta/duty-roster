export const QUERY_KEYS = {
	schedules: (year: number, month: number) =>
		["schedules", year, month] as const,
	schedulesBase: ["schedules"] as const,
	roster: (startDate: string, endDate: string) =>
		["roster", startDate, endDate] as const,
	rosterBase: ["roster"] as const,
	shifts: ["shifts"] as const,
	shiftRequirements: (year: number, month: number) =>
		["shiftRequirements", year, month] as const,
} as const;
