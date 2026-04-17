import * as rosterDb from "../db/roster";

type GenerateRosterParams = {
	year: number;
	month: number;
};

function getDateKey(date: Date | string) {
	if (typeof date === "string") return date;
	return date.toISOString().split("T")[0] ?? "";
}

function _getSolverNurseKey(index: number) {
	return `nurse_${index + 1}`;
}

// ───────────── SUMMARY ─────────────

type ScheduleRowInput = {
	id: string;
	date: string;
	nurse: {
		id: string;
		name: string;
	};
	shift: {
		id: string;
	} | null;
};

export function buildScheduleSummary(schedules: ScheduleRowInput[]) {
	const dailyShiftCountsMap = new Map<
		string,
		{ morning: number; evening: number; night: number; totalAssigned: number }
	>();
	const nurseShiftCountsMap = new Map<
		string,
		{
			nurse: { id: string; name: string };
			shifts: {
				morning: number;
				evening: number;
				night: number;
				totalAssigned: number;
			};
		}
	>();

	for (const schedule of schedules) {
		const dateKey = schedule.date;
		const shiftId = schedule.shift?.id;
		const normalizedShiftId = shiftId?.replace("shift_", "");

		const dailyCounts = dailyShiftCountsMap.get(dateKey) ?? {
			morning: 0,
			evening: 0,
			night: 0,
			totalAssigned: 0,
		};

		const nurseCounts = nurseShiftCountsMap.get(schedule.nurse.id) ?? {
			nurse: schedule.nurse,
			shifts: {
				morning: 0,
				evening: 0,
				night: 0,
				totalAssigned: 0,
			},
		};

		if (
			normalizedShiftId === "morning" ||
			normalizedShiftId === "evening" ||
			normalizedShiftId === "night"
		) {
			const key = normalizedShiftId as "morning" | "evening" | "night";

			dailyCounts[key]++;
			dailyCounts.totalAssigned++;

			nurseCounts.shifts[key]++;
			nurseCounts.shifts.totalAssigned++;
		}

		dailyShiftCountsMap.set(dateKey, dailyCounts);
		nurseShiftCountsMap.set(schedule.nurse.id, nurseCounts);
	}

	return {
		schedules,
		dailyShiftCounts: Array.from(dailyShiftCountsMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, shifts]) => ({ date, shifts })),

		nurseShiftCounts: Array.from(nurseShiftCountsMap.values()).sort((a, b) =>
			a.nurse.name.localeCompare(b.nurse.name),
		),
	};
}
export async function getNurses() {
	return rosterDb.findAllNurses();
}

export async function getShifts() {
	return rosterDb.findAllShifts();
}

export async function getSchedulesByDateRange(startDate: Date, endDate: Date) {
	const schedules = await rosterDb.findSchedulesByDateRange(startDate, endDate);

	// Transform dates to ISO strings first
	const transformedSchedules = schedules.map((s) => ({
		...s,
		date: getDateKey(s.date),
	}));

	// Build summary using transformed schedules (dates as strings)
	const summary = buildScheduleSummary(transformedSchedules);

	return {
		...summary,
		schedules: transformedSchedules,
	};
}

// ───────────── MAIN GENERATOR ─────────────

type ShiftType = "shift_morning" | "shift_evening" | "shift_night";

const WEEKDAY_COVERAGE = { morning: 20, evening: 3, night: 2 };
const FRIDAY_COVERAGE = { morning: 3, evening: 3, night: 2 };
const MAX_NIGHTS_PER_NURSE = 3;
const MIN_DAYS_OFF_PER_WEEK = 1;

function isFriday(year: number, month: number, day: number): boolean {
	const dayOfWeek = new Date(year, month - 1, day).getDay();
	return dayOfWeek === 5;
}

function getDaysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

function getWeekNumber(year: number, month: number, day: number): number {
	const date = new Date(year, month - 1, day);
	const startOfYear = new Date(year, 0, 1);
	const diff = date.getTime() - startOfYear.getTime();
	const oneWeek = 604800000;
	return Math.ceil((diff + startOfYear.getDay() * 86400000) / oneWeek);
}

export async function generateRoster(params: GenerateRosterParams) {
	const { year, month } = params;
	const nurses = await getNurses();
	const preferences = await listNurseShiftPreferenceWeights();
	const prefMap = new Map(preferences.map((p) => [p.nurseId, p]));

	const daysInMonth = getDaysInMonth(year, month);

	const nurseWorkDaysPerWeek = new Map<string, Map<string, number>>();
	const nurseNightCount = new Map<string, number>();
	const nurseTotalWorkCount = new Map<string, number>();

	nurses.forEach((n) => {
		nurseWorkDaysPerWeek.set(n.id, new Map());
		nurseNightCount.set(n.id, 0);
		nurseTotalWorkCount.set(n.id, 0);
	});

	const finalSchedules: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[] = [];

	for (let day = 1; day <= daysInMonth; day++) {
		const getWeekKey = (d: number) =>
			`${year}-${month}-${getWeekNumber(year, month, d)}`;
		const isFridayFn = (d: number) => isFriday(year, month, d);

		const isFri = isFridayFn(day);
		const coverage = isFri ? FRIDAY_COVERAGE : WEEKDAY_COVERAGE;
		const weekKey = getWeekKey(day);
		const dayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

		// 1. Identify available nurses and their utility scores
		const candidates = nurses
			.map((nurse) => {
				const nWeeks = nurseWorkDaysPerWeek.get(nurse.id);
				if (!nWeeks) return null;
				const currentWeekWork = nWeeks.get(weekKey) ?? 0;
				const currentNights = nurseNightCount.get(nurse.id) ?? 0;
				const totalWork = nurseTotalWorkCount.get(nurse.id) ?? 0;
				const prefs = prefMap.get(nurse.id);

				// Basic constraints
				const canWorkAny = currentWeekWork < 6; // Max 6 days a week
				const canWorkNight = canWorkAny && currentNights < MAX_NIGHTS_PER_NURSE;

				return {
					nurse,
					canWorkAny,
					canWorkNight,
					totalWork,
					prefs,
				};
			})
			.filter((c): c is NonNullable<typeof c> => c !== null)
			.filter((c) => c.canWorkAny);

		// Shuffle candidates for basic randomness
		candidates.sort(() => Math.random() - 0.5);

		// Priority sort: nurses with less total work first
		candidates.sort((a, b) => a.totalWork - b.totalWork);

		const assignedToday = new Set<string>();

		const assignShift = (
			type: ShiftType,
			count: number,
			condition: (c: (typeof candidates)[0]) => boolean,
		) => {
			let assigned = 0;
			// Further sort candidates by preference weight for this specific shift
			const shiftKey = type.replace("shift_", "") as
				| "morning"
				| "evening"
				| "night";

			const shiftCandidates = candidates
				.filter((c) => !assignedToday.has(c.nurse.id) && condition(c))
				.sort((a, b) => {
					const weightA = a.prefs?.[shiftKey] ?? 0;
					const weightB = b.prefs?.[shiftKey] ?? 0;
					// If total work is same, prefer by weight. Otherwise prefer by total work.
					if (a.totalWork !== b.totalWork) return a.totalWork - b.totalWork;
					return weightB - weightA;
				});

			for (const c of shiftCandidates) {
				if (assigned >= count) break;

				finalSchedules.push({
					nurseId: c.nurse.id,
					shiftId: type,
					date: dayDate,
				});

				assignedToday.add(c.nurse.id);
				assigned++;

				// Update counters
				nurseTotalWorkCount.set(
					c.nurse.id,
					(nurseTotalWorkCount.get(c.nurse.id) ?? 0) + 1,
				);
				const nWeeks = nurseWorkDaysPerWeek.get(c.nurse.id);
				if (nWeeks) {
					nWeeks.set(weekKey, (nWeeks.get(weekKey) ?? 0) + 1);
				}
				if (type === "shift_night") {
					nurseNightCount.set(
						c.nurse.id,
						(nurseNightCount.get(c.nurse.id) ?? 0) + 1,
					);
				}
			}
		};

		// Assign harder shifts first (Night, then Evening, then Morning)
		assignShift("shift_night", coverage.night, (c) => c.canWorkNight);
		assignShift("shift_evening", coverage.evening, () => true);
		assignShift("shift_morning", coverage.morning, () => true);

		// 2. Add explicit "OFF" days for the rest (Leaves)
		for (const nurse of nurses) {
			if (!assignedToday.has(nurse.id)) {
				finalSchedules.push({
					nurseId: nurse.id,
					shiftId: null, // Leaf / Off
					date: dayDate,
				});
			}
		}
	}

	await rosterDb.createSchedules(finalSchedules);

	return {
		year,
		month,
		schedulesCreated: finalSchedules.length,
		coverage: {
			weekday: WEEKDAY_COVERAGE,
			friday: FRIDAY_COVERAGE,
		},
		constraints: {
			maxNightsPerNurse: MAX_NIGHTS_PER_NURSE,
			minDaysOffPerWeek: MIN_DAYS_OFF_PER_WEEK,
		},
	};
}
export async function listNurseShiftPreferenceWeights() {
	const rows = await rosterDb.findAllPreferredShiftsByNurse();

	const grouped = rows.reduce(
		(acc, row) => {
			const nurseId = row.nurse.id;

			if (!acc[nurseId]) {
				acc[nurseId] = {
					nurseId,
					name: row.nurse.name,
				};
			}

			// Convert "shift_night" -> "night"
			const shiftKey = row.shiftId.replace("shift_", "");

			(acc[nurseId] as Record<string, unknown>)[shiftKey] = row.weight;

			return acc;
		},
		{} as Record<
			string,
			{
				nurseId: string;
				name: string;
				morning?: number;
				evening?: number;
				night?: number;
			}
		>,
	);

	// convert object → array
	return Object.values(grouped);
}

export async function updateNurseShiftPreferenceWeights(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
	}[],
) {
	return rosterDb.upsertNurseShiftPreferences(preferences);
}
