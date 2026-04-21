import * as rosterDb from "../db/roster";
import type { NurseShiftPreference } from "../schemas/roster";
import {
	createUTCDate,
	formatDateKey,
	normalizeShiftId,
} from "../utils/roster";

type GenerateRosterParams = {
	year: number;
	month: number;
};

// ───────────── CONFIG ─────────────

export const ROSTER_CONFIG = {
	COVERAGE: {
		WEEKDAY: { morning: 20, evening: 3, night: 2 },
		FRIDAY: { morning: 3, evening: 3, night: 2 },
	},
	CONSTRAINTS: {
		MAX_NIGHTS_PER_NURSE: 3,
		MIN_DAYS_OFF_PER_WEEK: 1,
	},
} as const;

// ───────────── HELPERS ─────────────

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

function isFriday(year: number, month: number, day: number): boolean {
	return new Date(year, month - 1, day).getDay() === 5;
}

// ───────────── SUMMARY ─────────────

type ScheduleRowInput = {
	id: string | null;
	date: string | null;
	nurse: { id: string; name: string };
	shift: { id: string } | null;
};

export function buildScheduleSummary(
	schedules: ScheduleRowInput[],
	options?: { preferences?: NurseShiftPreference[] },
) {
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
			preference?: NurseShiftPreference;
		}
	>();
	const nurseAssignmentsMap = new Map<
		string,
		Record<
			string,
			{ id: string; shiftType: "morning" | "evening" | "night" | "off" } | null
		>
	>();

	for (const schedule of schedules) {
		if (!nurseShiftCountsMap.has(schedule.nurse.id)) {
			nurseShiftCountsMap.set(schedule.nurse.id, {
				nurse: schedule.nurse,
				shifts: { morning: 0, evening: 0, night: 0, totalAssigned: 0 },
			});
		}
		if (!nurseAssignmentsMap.has(schedule.nurse.id)) {
			nurseAssignmentsMap.set(schedule.nurse.id, {});
		}
		if (!schedule.id || !schedule.date) continue;

		const nurseCounts = nurseShiftCountsMap.get(schedule.nurse.id)!;
		const nurseMap = nurseAssignmentsMap.get(schedule.nurse.id)!;
		const normalizedShiftId = normalizeShiftId(schedule.shift?.id);

		nurseMap[schedule.date] = {
			id: schedule.id,
			shiftType: (normalizedShiftId || "off") as
				| "morning"
				| "evening"
				| "night"
				| "off",
		};

		if (normalizedShiftId && normalizedShiftId !== "off") {
			nurseCounts.shifts[normalizedShiftId]++;
			nurseCounts.shifts.totalAssigned++;

			// Also update daily shift counts
			const dailyCounts = dailyShiftCountsMap.get(schedule.date) ?? {
				morning: 0,
				evening: 0,
				night: 0,
				totalAssigned: 0,
			};
			dailyCounts[normalizedShiftId]++;
			dailyCounts.totalAssigned++;
			dailyShiftCountsMap.set(schedule.date, dailyCounts);
		}
	}

	const prefMap = new Map(
		options?.preferences?.map((p) => [p.nurseId, p]) ?? [],
	);

	const nurseRows = Array.from(nurseShiftCountsMap.values())
		.map((n) => {
			const pref = prefMap.get(n.nurse.id);
			return {
				...n,
				nurse: { ...n.nurse, active: pref?.active ?? true },
				assignments: nurseAssignmentsMap.get(n.nurse.id) || {},
				preference: pref
					? { morning: pref.morning, evening: pref.evening, night: pref.night }
					: undefined,
			};
		})
		.sort((a, b) => {
			if (a.nurse.active !== b.nurse.active) return a.nurse.active ? -1 : 1;
			return a.nurse.name.localeCompare(b.nurse.name);
		});

	return {
		nurseRows,
		dailyShiftCounts: Object.fromEntries(dailyShiftCountsMap),
	};
}

// ───────────── PREFERENCES (merged logic) ─────────────

/** Get all preferences + capacity in one query */
export async function getNursePreferencesWithCapacity() {
	const rows = await rosterDb.findAllPreferredShiftsByNurse();

	const prefsMap = new Map<
		string,
		{
			nurseId: string;
			name: string;
			morning: number;
			evening: number;
			night: number;
			active: boolean;
		}
	>();
	const capacity = { morning: 0, evening: 0, night: 0 };

	for (const row of rows) {
		const nurseId = row.nurse.id;
		if (!prefsMap.has(nurseId)) {
			prefsMap.set(nurseId, {
				nurseId,
				name: row.nurse.name,
				morning: 0,
				evening: 0,
				night: 0,
				active: row.active ?? true,
			});
		}
		const pref = prefsMap.get(nurseId)!;
		const shiftKey = normalizeShiftId(row.shiftId) as
			| "morning"
			| "evening"
			| "night";
		if (shiftKey) {
			pref[shiftKey] = row.weight;
			// Add to capacity if active
			if (pref.active) {
				capacity[shiftKey] += row.weight;
			}
		}
	}

	return { preferences: Array.from(prefsMap.values()), capacity };
}

export async function listNurseShiftPreferenceWeights() {
	const { preferences } = await getNursePreferencesWithCapacity();
	return preferences;
}

export async function updateNurseShiftPreferenceWeights(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[],
	daysInMonth: number,
) {
	// Validate: ensure morning + evening + night <= 100%
	const byNurse = new Map<string, typeof preferences>();
	for (const p of preferences) {
		const existing = byNurse.get(p.nurseId) ?? [];
		existing.push(p);
		byNurse.set(p.nurseId, existing);
	}

	const validated: typeof preferences = [];
	for (const [, prefs] of byNurse) {
		const totalWeight = prefs.reduce((sum, p) => sum + p.weight, 0);
		if (totalWeight > 100) {
			// Normalize weights to sum to 100
			const scale = 100 / totalWeight;
			for (const p of prefs) {
				validated.push({ ...p, weight: Math.round(p.weight * scale) });
			}
		} else {
			validated.push(...prefs);
		}
	}

	await rosterDb.upsertNurseShiftPreferences(validated, daysInMonth);
}

// ───────────── REQUIRMENTS ─────────────

export async function getMonthlyShiftRequirements(year: number, month: number) {
	const daysInMonth = getDaysInMonth(year, month);

	// Day counts
	const dayOfWeekCounts = {
		monday: 0,
		tuesday: 0,
		wednesday: 0,
		thursday: 0,
		friday: 0,
		saturday: 0,
		sunday: 0,
	};
	const dayLabels = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	];
	for (let day = 1; day <= daysInMonth; day++) {
		const dayOfWeek = new Date(year, month - 1, day).getDay();
		dayOfWeekCounts[dayLabels[dayOfWeek] as keyof typeof dayOfWeekCounts]++;
	}

	// Assigned counts
	const assignedSchedules = await rosterDb.findShiftCountsByMonth(year, month);
	const assignedShiftCounts = { morning: 0, evening: 0, night: 0, total: 0 };
	for (const { shiftId } of assignedSchedules) {
		if (shiftId === "shift_morning") assignedShiftCounts.morning++;
		else if (shiftId === "shift_evening") assignedShiftCounts.evening++;
		else if (shiftId === "shift_night") assignedShiftCounts.night++;
	}
	assignedShiftCounts.total =
		assignedShiftCounts.morning +
		assignedShiftCounts.evening +
		assignedShiftCounts.night;

	// Requirements
	const { monday, tuesday, wednesday, thursday, friday, saturday, sunday } =
		dayOfWeekCounts;
	const weekdayCount = monday + tuesday + wednesday + thursday;
	const { WEEKDAY, FRIDAY } = ROSTER_CONFIG.COVERAGE;

	const calcShift = (shift: "morning" | "evening" | "night") =>
		weekdayCount * WEEKDAY[shift] +
		friday * FRIDAY[shift] +
		saturday * WEEKDAY[shift] +
		sunday * WEEKDAY[shift];

	const shiftRequirements = {
		morning: calcShift("morning"),
		evening: calcShift("evening"),
		night: calcShift("night"),
		total: 0,
	};
	shiftRequirements.total =
		shiftRequirements.morning +
		shiftRequirements.evening +
		shiftRequirements.night;

	// Capacity (from preferences)
	const { capacity } = await getNursePreferencesWithCapacity();
	const preferenceCapacity = {
		morning: Math.round((capacity.morning / 100) * daysInMonth),
		evening: Math.round((capacity.evening / 100) * daysInMonth),
		night: Math.round((capacity.night / 100) * daysInMonth),
		total: 0,
	};
	preferenceCapacity.total =
		preferenceCapacity.morning +
		preferenceCapacity.evening +
		preferenceCapacity.night;

	return {
		year,
		month,
		daysInMonth,
		dayOfWeekCounts,
		shiftRequirements,
		assignedShiftCounts,
		preferenceCapacity,
	};
}

// ───────────── SCHEDULES ─────────────

export async function getNurses() {
	return rosterDb.findAllNurses();
}

export async function getShifts() {
	return rosterDb.findAllShifts();
}

export async function getSchedulesByDateRange(startDate: Date, endDate: Date) {
	const [schedules, preferences] = await Promise.all([
		rosterDb.findSchedulesByDateRange(startDate, endDate),
		listNurseShiftPreferenceWeights(),
	]);

	const transformedSchedules = schedules.map((s) => ({
		...s,
		date: s.date ? formatDateKey(s.date) : null,
	}));

	return buildScheduleSummary(transformedSchedules, { preferences });
}

export async function updateSchedule(id: string, shiftId: string | null) {
	return rosterDb.updateScheduleShift(id, shiftId === "off" ? null : shiftId);
}

// ───────────── GENERATE ROSTER ─────────────

type ShiftType = "shift_morning" | "shift_evening" | "shift_night";

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

	for (const n of nurses) {
		nurseWorkDaysPerWeek.set(n.id, new Map());
		nurseNightCount.set(n.id, 0);
		nurseTotalWorkCount.set(n.id, 0);

		const prefs = prefMap.get(n.id);
		nurseShiftTargets.set(n.id, {
			morning: Math.round(((prefs?.morning ?? 0) / 100) * daysInMonth),
			evening: Math.round(((prefs?.evening ?? 0) / 100) * daysInMonth),
			night: Math.round(((prefs?.night ?? 0) / 100) * daysInMonth),
		});
		nurseShiftAssigned.set(n.id, { morning: 0, evening: 0, night: 0 });
	}

	const finalSchedules: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[] = [];

	for (let day = 1; day <= daysInMonth; day++) {
		const weekKey = `${year}-${month}-${getWeekNumber(year, month, day)}`;
		const isFri = isFriday(year, month, day);
		const coverage = isFri
			? ROSTER_CONFIG.COVERAGE.FRIDAY
			: ROSTER_CONFIG.COVERAGE.WEEKDAY;
		const dayDate = createUTCDate(year, month, day);
		const assignedToday = new Set<string>();

		const assignShift = (
			type: ShiftType,
			count: number,
			condition: (
				nurse: (typeof nurses)[0],
				c: Record<string, unknown>,
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
						currentWeekWork < 6 &&
						currentNights < ROSTER_CONFIG.CONSTRAINTS.MAX_NIGHTS_PER_NURSE,
					totalWork,
					targets,
					assigned,
					prefs,
					currentCount: assigned?.[shiftKey] ?? 0,
					targetCount: targets?.[shiftKey] ?? 0,
					weight: prefs?.[shiftKey] ?? 0,
				};
			};

			const phase1 = nurses
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

			for (const c of phase1) {
				if (assignedCount >= count) break;
				finalSchedules.push({
					nurseId: c.nurse.id,
					shiftId: type,
					date: dayDate,
				});
				assignedToday.add(c.nurse.id);
				assignedCount++;
				nurseTotalWorkCount.set(c.nurse.id, c.totalWork + 1);
				nurseWorkDaysPerWeek.get(c.nurse.id)?.set(weekKey, currentWeekWork + 1);
				if (c.assigned) c.assigned[shiftKey] = (c.assigned[shiftKey] ?? 0) + 1;
				if (type === "shift_night")
					nurseNightCount.set(c.nurse.id, currentNights + 1);
			}

			if (assignedCount < count) {
				const phase2 = nurses
					.map(getCandidateState)
					.filter((c) => {
						if (assignedToday.has(c.nurse.id)) return false;
						if (!c.canWorkAny) return false;
						if (!condition(c.nurse, c)) return false;
						return true;
					})
					.sort((a, b) => {
						const overA = a.currentCount - a.targetCount;
						const overB = b.currentCount - b.targetCount;
						if (overA !== overB) return overA - overB;
						return a.totalWork - b.totalWork;
					});

				for (const c of phase2) {
					if (assignedCount >= count) break;
					finalSchedules.push({
						nurseId: c.nurse.id,
						shiftId: type,
						date: dayDate,
					});
					assignedToday.add(c.nurse.id);
					assignedCount++;
					nurseTotalWorkCount.set(c.nurse.id, c.totalWork + 1);
					nurseWorkDaysPerWeek
						.get(c.nurse.id)
						?.set(weekKey, currentWeekWork + 1);
					if (c.assigned)
						c.assigned[shiftKey] = (c.assigned[shiftKey] ?? 0) + 1;
					if (type === "shift_night")
						nurseNightCount.set(c.nurse.id, currentNights + 1);
				}
			}
		};

		assignShift("shift_night", coverage.night, (_n, c) => c.canWorkNight);
		assignShift("shift_evening", coverage.evening, () => true);
		assignShift("shift_morning", coverage.morning, () => true);

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
		coverage: ROSTER_CONFIG.COVERAGE,
		constraints: ROSTER_CONFIG.CONSTRAINTS,
	};
}
