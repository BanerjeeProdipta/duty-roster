import * as rosterDb from "./db";
import type { SchedulesResponse } from "./schema";
import {
	assignRequiredShifts,
	buildNurseProfiles,
	getDaysCountFromStartAndEndDate,
	getDaysInMonth,
	getDayType,
	getMonthDateRange,
	isFriday,
	normalizeDateKey,
	resetDailyState,
	type ShiftTypeKey,
	type ShiftUpdateResult,
	shiftIdToShiftType,
} from "./utils";

export { FRIDAY_OFF_NURSES, ROSTER_CONFIG } from "./utils";
export type { ShiftTypeKey, ShiftUpdateResult };

// ───────────── PREFERENCES (merged logic) ─────────────

export async function updateNurseShiftPreferenceWeights(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[],
	daysInMonth: number,
) {
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

// ───────────── SCHEDULES ─────────────

export async function getShifts() {
	return rosterDb.findAllShifts();
}

/**
 * Fetches schedules and preferences for a date range and computes aggregated metrics.
 */
export async function getSchedulesByDateRange(
	startDate: Date,
	endDate: Date,
): Promise<SchedulesResponse> {
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	const totalDays = getDaysCountFromStartAndEndDate(startDate, endDate);

	const dailyShiftCounts: Record<
		string,
		{ morning: number; evening: number; night: number; total: number }
	> = {};

	const nurseRows = rows.map((row) => {
		const rawAssignments = (row.assignments ?? {}) as Record<
			string,
			{ id: string; shiftType: string } | null
		>;
		const assignments: Record<
			string,
			{ id: string; shiftType: "morning" | "evening" | "night" | "off" } | null
		> = {};

		for (const [date, assignment] of Object.entries(rawAssignments)) {
			const normalizedDate = normalizeDateKey(date);
			if (assignment) {
				assignments[normalizedDate] = {
					id: assignment.id,
					shiftType: shiftIdToShiftType(assignment.shiftType),
				};
			}

			if (!assignment) continue;

			if (!dailyShiftCounts[normalizedDate]) {
				dailyShiftCounts[normalizedDate] = {
					morning: 0,
					evening: 0,
					night: 0,
					total: 0,
				};
			}

			if (assignment.shiftType === "morning")
				dailyShiftCounts[normalizedDate].morning++;
			else if (assignment.shiftType === "evening")
				dailyShiftCounts[normalizedDate].evening++;
			else if (assignment.shiftType === "night")
				dailyShiftCounts[normalizedDate].night++;
			if (assignment.shiftType !== "off")
				dailyShiftCounts[normalizedDate].total++;
		}

		const preferenceMorning = Math.round(
			((Number(row.prefMorning) || 0) / 100) * totalDays,
		);
		const preferenceEvening = Math.round(
			((Number(row.prefEvening) || 0) / 100) * totalDays,
		);
		const preferenceNight = Math.round(
			((Number(row.prefNight) || 0) / 100) * totalDays,
		);

		return {
			nurse: {
				id: row.id as string,
				name: row.name as string,
				active: row.active as boolean,
			},
			assignedShiftMetrics: {
				morning: Number(row.shiftMorning),
				evening: Number(row.shiftEvening),
				night: Number(row.shiftNight),
				total: Number(row.totalAssigned),
			},
			assignments,
			preferenceWiseShiftMetrics: {
				morning: preferenceMorning,
				evening: preferenceEvening,
				night: preferenceNight,
				total: preferenceMorning + preferenceEvening + preferenceNight,
			},
		};
	});

	const assignedShiftCounts = {
		morning: 0,
		evening: 0,
		night: 0,
		total: 0,
	};

	const preferenceCapacity = {
		morning: 0,
		evening: 0,
		night: 0,
		total: 0,
	};

	for (const [, counts] of Object.entries(dailyShiftCounts)) {
		assignedShiftCounts.morning += counts.morning ?? 0;
		assignedShiftCounts.evening += counts.evening ?? 0;
		assignedShiftCounts.night += counts.night ?? 0;
		assignedShiftCounts.total += counts.total ?? 0;
	}

	for (const row of nurseRows) {
		const pref = row.preferenceWiseShiftMetrics;
		preferenceCapacity.morning += pref.morning ?? 0;
		preferenceCapacity.evening += pref.evening ?? 0;
		preferenceCapacity.night += pref.night ?? 0;
		preferenceCapacity.total += pref.total ?? 0;
	}

	let fridayCount = 0;
	let weekdayCount = 0;

	for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
		const dateStr = d.toISOString().split("T")[0] ?? "";
		if (isFriday(dateStr)) {
			fridayCount++;
		} else {
			weekdayCount++;
		}
	}

	const shiftRequirements = {
		morning: weekdayCount * 20 + fridayCount * 3,
		evening: (weekdayCount + fridayCount) * 3,
		night: (weekdayCount + fridayCount) * 2,
		total:
			weekdayCount * 20 +
			fridayCount * 3 +
			(weekdayCount + fridayCount) * 3 +
			(weekdayCount + fridayCount) * 2,
	};

	return {
		nurseRows,
		dailyShiftCounts,
		shiftRequirements,
		assignedShiftCounts,
		preferenceCapacity,
	};
}

export async function upsertSchedule(
	id: string,
	shiftId: string | null,
	nurseId?: string,
	dateKey?: string,
): Promise<ShiftUpdateResult | null> {
	let oldShiftType: ShiftTypeKey | null = null;

	if (id === "new" && nurseId && dateKey) {
		const createdId = `schedule_${nurseId}_${dateKey}`;
		await rosterDb.createSchedule(nurseId, new Date(dateKey), shiftId);
		return {
			id: createdId,
			dateKey: dateKey,
			nurseId,
			oldShiftType: null,
			newShiftType: shiftIdToShiftType(shiftId),
		};
	}

	if (!id || id === "new") {
		return null;
	}

	const existing = await rosterDb.findScheduleById(id);
	if (existing?.shiftId) {
		oldShiftType = shiftIdToShiftType(existing.shiftId as string);
	}

	await rosterDb.updateScheduleShift(id, shiftId === "off" ? null : shiftId);

	const resultShiftType = shiftIdToShiftType(shiftId);

	return {
		id,
		dateKey: dateKey || "",
		nurseId: nurseId || "",
		oldShiftType,
		newShiftType: resultShiftType,
	};
}

// ───────────── GENERATE ROSTER ─────────────

type GenerateRosterParams = {
	year: number;
	month: number;
};

export async function generateRoster({ year, month }: GenerateRosterParams) {
	const t0 = performance.now();
	const daysInMonth = getDaysInMonth(year, month);
	const { startDate, endDate } = getMonthDateRange(year, month);

	// Truncate nurse_schedule for this month first
	await rosterDb.truncateSchedulesByDateRange(startDate, endDate);

	const t1 = performance.now();
	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);
	const t2 = performance.now();

	const profiles = buildNurseProfiles(rows, daysInMonth);
	const assignments = new Map<
		string,
		{ shiftType: "morning" | "evening" | "night"; nurseId: string }[]
	>();

	const t3 = performance.now();
	for (let day = 1; day <= daysInMonth; day++) {
		const dayType = getDayType(year, month, day);
		assignRequiredShifts(
			year,
			month,
			profiles,
			dayType,
			day,
			assignments,
			daysInMonth,
		);
		// Get today's assignments
		const dayKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
		const assignmentsToday = assignments.get(dayKey) ?? [];
		resetDailyState(profiles, assignmentsToday);
	}
	const t4 = performance.now();

	const schedules: { nurseId: string; shiftId: string; date: Date }[] = [];
	for (const [dateKey, items] of assignments) {
		const date = new Date(`${dateKey}T00:00:00.000Z`);
		for (const item of items) {
			schedules.push({
				nurseId: item.nurseId,
				shiftId: `shift_${item.shiftType}`,
				date,
			});
		}
	}

	const t5 = performance.now();
	await rosterDb.createSchedules(schedules);
	const t6 = performance.now();

	console.log("Roster timing:", {
		setup: t1 - t0,
		dbFetch: t2 - t1,
		buildProfiles: t3 - t2,
		algorithm: t4 - t3,
		format: t5 - t4,
		dbWrite: t6 - t5,
		total: t6 - t0,
	});

	return {
		success: true,
		scheduledDays: schedules.length,
	};
}
