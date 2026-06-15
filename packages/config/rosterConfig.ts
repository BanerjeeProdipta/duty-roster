export const ROSTER_CONFIG = {
	COVERAGE: {
		WEEKDAY: { morning: 24, evening: 3, night: 2 },
		FRIDAY: { morning: 5, evening: 3, night: 2 },
	},
	CONSTRAINTS: {
		MAX_CONSECUTIVE_NIGHTS: 2,
		MAX_CONSECUTIVE_DAYS: 6,
		MIN_DAYS_OFF_PER_WEEK: 1,
		NIGHT_CONSTRAIN: 2,
	},
} as const;

export const FRIDAY_OFF_NURSES: string[] = [];

export type ShiftCounts = { morning: number; evening: number; night: number };

export type RosterConfig = typeof ROSTER_CONFIG;

export default ROSTER_CONFIG;
