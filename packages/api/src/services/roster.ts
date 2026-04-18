import * as rosterDb from "../db/roster";

type GenerateRosterParams = {
	year: number;
	month: number;
};

function getDateKey(date: Date | string) {
	if (typeof date === "string") return date;
	return date.toISOString().split("T")[0] ?? "";
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

	const nurseAssignmentsMap = new Map<
		string,
		Record<string, { id: string } | null>
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

		if (!nurseAssignmentsMap.has(schedule.nurse.id)) {
			nurseAssignmentsMap.set(schedule.nurse.id, {});
		}
		const nurseMap = nurseAssignmentsMap.get(schedule.nurse.id);
		if (nurseMap) {
			nurseMap[dateKey] = {
				id: schedule.id,
				shiftType: (normalizedShiftId || "off") as
					| "morning"
					| "evening"
					| "night"
					| "off",
			};
		}

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

	const nurseRows = Array.from(nurseShiftCountsMap.values())
		.map((n) => ({
			...n,
			assignments: nurseAssignmentsMap.get(n.nurse.id) || {},
		}))
		.sort((a, b) => a.nurse.name.localeCompare(b.nurse.name));

	return {
		nurseRows,
		dailyShiftCounts: Array.from(dailyShiftCountsMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, shifts]) => ({ date, shifts })),
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

	return summary;
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

	const nurseShiftTargets = new Map<string, Record<string, number>>();
	const nurseShiftAssigned = new Map<string, Record<string, number>>();
	const nurseWorkDaysPerWeek = new Map<string, Map<string, number>>();
	const nurseNightCount = new Map<string, number>();
	const nurseTotalWorkCount = new Map<string, number>();

	nurses.forEach((n) => {
		nurseWorkDaysPerWeek.set(n.id, new Map());
		nurseNightCount.set(n.id, 0);
		nurseTotalWorkCount.set(n.id, 0);

		// Initialize targets and assigned counts
		const prefs = prefMap.get(n.id);
		nurseShiftTargets.set(n.id, {
			morning: Math.round(((prefs?.morning ?? 0) / 100) * daysInMonth),
			evening: Math.round(((prefs?.evening ?? 0) / 100) * daysInMonth),
			night: Math.round(((prefs?.night ?? 0) / 100) * daysInMonth),
		});
		nurseShiftAssigned.set(n.id, { morning: 0, evening: 0, night: 0 });
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
		// Always create UTC noon dates for scheduling
		const dayDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

		const assignedToday = new Set<string>();

		const assignShift = (
			type: ShiftType,
			count: number,
			condition: (
				nurse: (typeof nurses)[0],
				state: Record<string, unknown>,
			) => boolean,
		) => {
			let assignedCount = 0;
			const shiftKey = type.replace("shift_", "") as
				| "morning"
				| "evening"
				| "night";

			const getCandidateState = (nurse: (typeof nurses)[0]) => {
				const nWeeks = nurseWorkDaysPerWeek.get(nurse.id);
				const currentWeekWork = nWeeks?.get(weekKey) ?? 0;
				const currentNights = nurseNightCount.get(nurse.id) ?? 0;
				const totalWork = nurseTotalWorkCount.get(nurse.id) ?? 0;
				const targets = nurseShiftTargets.get(nurse.id);
				const assigned = nurseShiftAssigned.get(nurse.id);
				const prefs = prefMap.get(nurse.id);

				return {
					nurse,
					currentWeekWork,
					canWorkAny: currentWeekWork < 6,
					canWorkNight:
						currentWeekWork < 6 && currentNights < MAX_NIGHTS_PER_NURSE,
					totalWork,
					targets,
					assigned,
					prefs,
					currentCount: assigned?.[shiftKey] ?? 0,
					targetCount: targets?.[shiftKey] ?? 0,
					weight: prefs?.[shiftKey] ?? 0,
				};
			};

			// Phase 1: Under-target candidates
			const phase1Candidates = nurses
				.map(getCandidateState)
				.filter((c) => {
					if (assignedToday.has(c.nurse.id)) return false;
					if (!c.canWorkAny) return false;
					if (!condition(c.nurse, c)) return false;
					return c.currentCount < c.targetCount;
				})
				.sort((a, b) => {
					if (a.weight !== b.weight) return b.weight - a.weight;
					return a.totalWork - b.totalWork;
				});

			for (const c of phase1Candidates) {
				if (assignedCount >= count) break;
				doAssign(c);
			}

			// Phase 2: Overflow (fill remaining slots for coverage if needed)
			if (assignedCount < count) {
				const phase2Candidates = nurses
					.map(getCandidateState)
					.filter((c) => {
						if (assignedToday.has(c.nurse.id)) return false;
						if (!c.canWorkAny) return false;
						if (!condition(c.nurse, c)) return false;
						return true; // Already checked Phase 1, these might be over-target
					})
					.sort((a, b) => {
						// Fairness first: pick those least over their target or least total work
						const overA = a.currentCount - a.targetCount;
						const overB = b.currentCount - b.targetCount;
						if (overA !== overB) return overA - overB;
						return a.totalWork - b.totalWork;
					});

				for (const c of phase2Candidates) {
					if (assignedCount >= count) break;
					doAssign(c);
				}
			}

			function doAssign(c: ReturnType<typeof getCandidateState>) {
				finalSchedules.push({
					nurseId: c.nurse.id,
					shiftId: type,
					date: dayDate,
				});

				assignedToday.add(c.nurse.id);
				assignedCount++;

				// Update counters
				nurseTotalWorkCount.set(c.nurse.id, c.totalWork + 1);
				const nWeeks = nurseWorkDaysPerWeek.get(c.nurse.id);
				if (nWeeks) {
					nWeeks.set(weekKey, c.currentWeekWork + 1);
				}
				if (c.assigned) {
					const cur = c.assigned[shiftKey] ?? 0;
					c.assigned[shiftKey] = cur + 1;
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
		assignShift("shift_night", coverage.night, (_n, c) => c.canWorkNight);
		assignShift("shift_evening", coverage.evening, () => true);
		assignShift("shift_morning", coverage.morning, () => true);

		// Add "OFF" entries for non-assigned nurses
		for (const nurse of nurses) {
			if (!assignedToday.has(nurse.id)) {
				finalSchedules.push({
					nurseId: nurse.id,
					shiftId: null,
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
export async function updateSchedule(id: string, shiftId: string | null) {
	// If shiftId is "off", we treat it as null shift
	const normalizedShiftId = shiftId === "off" ? null : shiftId;
	return rosterDb.updateScheduleShift(id, normalizedShiftId);
}
