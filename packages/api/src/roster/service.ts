import * as rosterDb from "./db";
import type { SchedulesResponse } from "./schema";

import {
	buildCoverageForMonth,
	calculateFairShares,
	FRIDAY_OFF_NURSES,
	getDaysCountFromStartAndEndDate,
	getDaysInMonth,
	getFridayIndicesForMonth,
	getShiftRequirementsForMonth,
	getShiftRequirementsForRange,
	normalizeDateKey,
	ROSTER_CONFIG,
	runSolver,
	type ShiftTypeKey,
	type ShiftUpdateResult,
	shiftIdToShiftType,
} from "./utils";

type SolverRoster = Record<string, string[]>;

export { FRIDAY_OFF_NURSES, ROSTER_CONFIG } from "./utils";
export type { ShiftTypeKey, ShiftUpdateResult };

// ───────────── PREFERENCES (merged logic) ─────────────

export async function updateNurse({
	nurseId,
	name,
	active,
}: {
	nurseId: string;
	name?: string;
	active?: boolean;
}) {
	console.log("📝 updateNurse called:", { nurseId, name, active });
	const data: { name?: string; active?: boolean } = {};
	if (name !== undefined) data.name = name;
	if (active !== undefined) data.active = active;
	if (Object.keys(data).length > 0) {
		console.log("📝 Updating nurse in DB:", { nurseId, data });
		await rosterDb.updateNurse(nurseId, data);
		console.log("✅ Nurse updated");
	} else {
		console.log("⚠️ No data to update");
	}
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

export async function prefillFairPreferences(
	year: number,
	month: number,
): Promise<{ success: boolean; updated: number }> {
	const totalDays = getDaysInMonth(year, month);
	const shiftRequirements = getShiftRequirementsForMonth(year, month);

	const allNurses = await rosterDb.findAllNurses();
	const activeNurses = allNurses.filter((n) => n.active !== false);
	const nurseCount = activeNurses.length;

	if (nurseCount === 0) {
		return { success: false, updated: 0 };
	}

	// Fair: (requirement + preference) / 2
	// Requirement per nurse = req / nurseCount
	// Preference per nurse = what maximize would give (max working days per nurse)
	// Maximize: nurses work ~6 days/week (1 off/week), so ~26 days/month
	const weeksInMonth = Math.floor(totalDays / 7);
	const extraDays = totalDays % 7;
	const maxWorkingDaysPerNurse = weeksInMonth * 6 + Math.min(extraDays, 6);

	// Preference = proportional distribution of maxWorkingDays based on req proportions
	const totalReq =
		shiftRequirements.morning +
		shiftRequirements.evening +
		shiftRequirements.night;

	const calcFairWeight = (req: number) => {
		if (req === 0) return 0;
		const reqPerNurse = req / nurseCount;
		// Preference per nurse for this shift type (proportional to req)
		const prefPerNurse =
			totalReq > 0
				? (req / totalReq) * maxWorkingDaysPerNurse
				: maxWorkingDaysPerNurse / 3;
		// Fair = midpoint between req and pref
		const fairPerNurse = (reqPerNurse + prefPerNurse) / 2;
		return Math.min(
			100,
			Math.max(1, Math.round((fairPerNurse / totalDays) * 100)),
		);
	};

	let wM = calcFairWeight(shiftRequirements.morning);
	let wE = calcFairWeight(shiftRequirements.evening);
	let wN = calcFairWeight(shiftRequirements.night);

	// Adjust for constraints: total used = m + e + n + nightCooldown <= totalDays
	const adjustWeights = () => {
		const m = Math.floor((wM / 100) * totalDays);
		const e = Math.floor((wE / 100) * totalDays);
		const n = Math.floor((wN / 100) * totalDays);
		const nightCooldown = Math.floor(n / 2);
		const total = m + e + n + nightCooldown;

		if (total > totalDays) {
			const maxAllowed = totalDays - nightCooldown;
			const currentShifts = m + e + n;
			if (currentShifts > maxAllowed && currentShifts > 0) {
				const scale = maxAllowed / currentShifts;
				wM = Math.max(1, Math.floor(wM * scale));
				wE = Math.max(1, Math.floor(wE * scale));
				wN = Math.max(1, Math.floor(wN * scale));
			}
		}
	};
	adjustWeights();

	const preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[] = [];

	for (const nurse of activeNurses) {
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_morning",
			weight: wM,
			active: true,
		});
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_evening",
			weight: wE,
			active: true,
		});
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_night",
			weight: wN,
			active: true,
		});
	}

	await rosterDb.upsertNurseShiftPreferences(preferences, totalDays);
	return { success: true, updated: activeNurses.length };
}

export async function prefillMinimizeShifts(
	year: number,
	month: number,
): Promise<{ success: boolean; updated: number }> {
	const totalDays = getDaysInMonth(year, month);
	const shiftRequirements = getShiftRequirementsForMonth(year, month);

	const allNurses = await rosterDb.findAllNurses();
	const activeNurses = allNurses.filter((n) => n.active !== false);
	const nurseCount = activeNurses.length;

	if (nurseCount === 0) {
		return { success: false, updated: 0 };
	}

	// Minimize: Fill up ~requirements with minimal buffer
	// Calculate weight so floor((w/100)*totalDays) * nurseCount >= requirement
	// Minimal buffer: just +0.5 shift per nurse to handle floor() truncation
	const calcMinWeight = (req: number) => {
		if (req === 0) return 0;
		const reqPerNurse = req / nurseCount;
		// Just enough to meet requirement, accounting for floor() truncation
		const targetShifts = reqPerNurse + 0.5; // Minimal buffer for floor()
		return Math.min(
			100,
			Math.max(1, Math.round((targetShifts / totalDays) * 100)),
		);
	};

	let wM = calcMinWeight(shiftRequirements.morning);
	let wE = calcMinWeight(shiftRequirements.evening);
	let wN = calcMinWeight(shiftRequirements.night);

	// Adjust for constraints: night cooldown (1 off day per 2 nights)
	// Total used days = morning + evening + night + nightCooldown must <= totalDays
	const adjustWeights = () => {
		const m = Math.floor((wM / 100) * totalDays);
		const e = Math.floor((wE / 100) * totalDays);
		const n = Math.floor((wN / 100) * totalDays);
		const nightCooldown = Math.floor(n / 2);
		const total = m + e + n + nightCooldown;

		if (total > totalDays) {
			// Scale down proportionally, preserving priority: morning > evening > night (for requirements)
			const maxAllowed = totalDays - nightCooldown;
			const currentShifts = m + e + n;
			if (currentShifts > maxAllowed && currentShifts > 0) {
				const scale = maxAllowed / currentShifts;
				// Scale down with priority: morning (highest req) scales least
				wN = Math.max(1, Math.floor(wN * scale));
				wE = Math.max(1, Math.floor(wE * scale * 0.95)); // evening slightly more
				wM = Math.max(1, Math.floor(wM * scale * 0.9)); // morning scales most
			}
		}
	};
	adjustWeights();

	const preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[] = [];

	for (const nurse of activeNurses) {
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_morning",
			weight: wM,
			active: true,
		});
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_evening",
			weight: wE,
			active: true,
		});
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_night",
			weight: wN,
			active: true,
		});
	}

	await rosterDb.upsertNurseShiftPreferences(preferences, totalDays);
	return { success: true, updated: activeNurses.length };
}

export async function prefillMaximizeShifts(
	year: number,
	month: number,
): Promise<{ success: boolean; updated: number }> {
	const totalDays = getDaysInMonth(year, month);
	const shiftRequirements = getShiftRequirementsForMonth(year, month);

	const allNurses = await rosterDb.findAllNurses();
	const activeNurses = allNurses.filter((n) => n.active !== false);
	const nurseCount = activeNurses.length;

	if (nurseCount === 0) {
		return { success: false, updated: 0 };
	}

	// Maximize (min off = 1 day per week): Maximize shifts worked per nurse
	// With 1 day off per week, max working days = 6 per week
	// For a 30-day month: 4 weeks * 6 + 2 extra days = 26 max working days per nurse
	// But night shifts have cooldown: 2 nights -> 1 day off (NIGHT_CONSTRAIN = 2)
	// So if nurse works n night shifts, need floor(n/2) cooldown days

	// Calculate max working days per nurse (min 1 off per week)
	const weeksInMonth = Math.floor(totalDays / 7);
	const extraDays = totalDays % 7;
	const maxWorkingDaysPerNurse = weeksInMonth * 6 + Math.min(extraDays, 6); // Cap extra at 6 (need 1 off)

	// Proportionally distribute max working days across shift types based on requirements
	const totalReq =
		shiftRequirements.morning +
		shiftRequirements.evening +
		shiftRequirements.night;
	const proportions = {
		morning: totalReq > 0 ? shiftRequirements.morning / totalReq : 1 / 3,
		evening: totalReq > 0 ? shiftRequirements.evening / totalReq : 1 / 3,
		night: totalReq > 0 ? shiftRequirements.night / totalReq : 1 / 3,
	};

	// Calculate target shifts per nurse for each type (proportional to requirements)
	let targetM = Math.floor(maxWorkingDaysPerNurse * proportions.morning);
	let targetE = Math.floor(maxWorkingDaysPerNurse * proportions.evening);
	let targetN = Math.floor(maxWorkingDaysPerNurse * proportions.night);

	// Adjust for night cooldown: total used = m + e + n + floor(n/2) <= totalDays
	const adjustForCooldown = () => {
		const nightCooldown = Math.floor(targetN / 2);
		const totalUsed = targetM + targetE + targetN + nightCooldown;
		if (totalUsed > totalDays) {
			// Reduce proportionally, prioritizing night (to maximize night shifts)
			const excess = totalUsed - totalDays;
			const totalShifts = targetM + targetE + targetN;
			if (totalShifts > 0) {
				// Reduce each proportionally
				targetM = Math.max(
					1,
					targetM - Math.floor((targetM / totalShifts) * excess),
				);
				targetE = Math.max(
					1,
					targetE - Math.floor((targetE / totalShifts) * excess),
				);
				// Keep night as high as possible
				const remaining = totalDays - nightCooldown - targetM - targetE;
				targetN = Math.max(targetN, remaining);
			}
		}
	};
	adjustForCooldown();

	// Convert to weights (percentage of totalDays)
	const wM = Math.min(
		100,
		Math.max(1, Math.round((targetM / totalDays) * 100)),
	);
	const wE = Math.min(
		100,
		Math.max(1, Math.round((targetE / totalDays) * 100)),
	);
	const wN = Math.min(
		100,
		Math.max(1, Math.round((targetN / totalDays) * 100)),
	);

	const preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[] = [];

	for (const nurse of activeNurses) {
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_morning",
			weight: wM,
			active: true,
		});
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_evening",
			weight: wE,
			active: true,
		});
		preferences.push({
			nurseId: nurse.id,
			shiftId: "shift_night",
			weight: wN,
			active: true,
		});
	}

	await rosterDb.upsertNurseShiftPreferences(preferences, totalDays);
	return { success: true, updated: activeNurses.length };
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
	const startStr = startDate.toISOString();
	const endStr = endDate.toISOString();
	console.log(
		`📅 getSchedulesByDateRange called with: start=${startStr}, end=${endStr}`,
	);

	// Normalize to UTC dates for query
	const queryStart = new Date(startDate);
	queryStart.setUTCHours(0, 0, 0, 0);
	const queryEnd = new Date(endDate);
	queryEnd.setUTCHours(23, 59, 59, 999);

	console.log(
		`📅 Query range: ${queryStart.toISOString()} to ${queryEnd.toISOString()}`,
	);

	const rows = await rosterDb.findSchedulesAndPreferencesByDateRange(
		startDate,
		endDate,
	);

	// Debug: check what dates are in results
	const allDates = new Set<string>();
	for (const row of rows) {
		const assignments = (row.assignments as Record<string, unknown>) || {};
		for (const dateKey of Object.keys(assignments)) {
			allDates.add(dateKey);
		}
	}
	console.log(
		"📅 Dates in DB results:",
		Array.from(allDates).sort().slice(0, 10),
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
		if (!row.nurse.active) continue;

		const pref = row.preferenceWiseShiftMetrics;
		preferenceCapacity.morning += pref.morning ?? 0;
		preferenceCapacity.evening += pref.evening ?? 0;
		preferenceCapacity.night += pref.night ?? 0;
		preferenceCapacity.total += pref.total ?? 0;
	}

	const shiftRequirements = {
		...getShiftRequirementsForRange(startDate, endDate),
		total: 0,
	};
	shiftRequirements.total =
		shiftRequirements.morning +
		shiftRequirements.evening +
		shiftRequirements.night;

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

type ShiftPreferences = {
	shift_off: number;
	[shiftId: string]: number;
};

// ───────────── GENERATE ROSTER (PREP FOR OR-TOOLS) ─────────────

export async function generateRoster({ year, month }: GenerateRosterParams) {
	const nurseShiftPreferences = await rosterDb.findAllPreferredShiftsByNurse();

	const totalDays = getDaysInMonth(year, month);

	// ─────────────────────────────────────────────
	// 1. Build nurse preference map (solver input)
	// ─────────────────────────────────────────────

	// Calculate previous month for boundary constraints
	let prevYear = year;
	let prevMonth = month - 1;
	if (prevMonth === 0) {
		prevMonth = 12;
		prevYear--;
	}
	const prevMonthTotalDays = getDaysInMonth(prevYear, prevMonth);
	// Last 2 days of prev month (using local date strings to match DB queries)
	const prevDateMinus2 = new Date(
		Date.UTC(prevYear, prevMonth - 1, prevMonthTotalDays - 1),
	);
	const prevDateMinus1 = new Date(
		Date.UTC(prevYear, prevMonth - 1, prevMonthTotalDays),
	);
	const dateMinus2Str = prevDateMinus2.toISOString().split("T")[0];
	const dateMinus1Str = prevDateMinus1.toISOString().split("T")[0];

	const prevSchedules = await rosterDb.findSchedulesAndPreferencesByDateRange(
		prevDateMinus2,
		prevDateMinus1,
	);

	const previousShifts: Record<string, string[]> = {};
	for (const p of prevSchedules) {
		const shifts: string[] = ["off", "off"];
		if (p.assignments && typeof p.assignments === "object") {
			const assignments = p.assignments as Record<
				string,
				{ shiftType: string }
			>;
			if (assignments[dateMinus2Str])
				shifts[0] = assignments[dateMinus2Str].shiftType;
			if (assignments[dateMinus1Str])
				shifts[1] = assignments[dateMinus1Str].shiftType;
		}
		const nurseId = (p as any).nurse?.id ?? (p as any).id;
		if (nurseId) {
			previousShifts[nurseId as string] = shifts;
		}
	}
	const nurseShiftPreferenceMap = new Map<string, ShiftPreferences>();

	// Get all unique nurse IDs from preferences (including those with active=false)
	const uniqueNurseIds = new Set(nurseShiftPreferences.map((p) => p.nurse.id));

	// Initialize all nurses from preferences
	for (const nurseId of uniqueNurseIds) {
		nurseShiftPreferenceMap.set(nurseId, {
			shift_off: 100,
		});
	}

	// Apply active preferences
	for (const row of nurseShiftPreferences) {
		const { weight, shiftId, active } = row;
		console.log(
			`🔍 Preference row: nurse=${row.nurse.id}, shiftId=${shiftId}, weight=${weight}, active=${active}`,
		);

		const nurseId = row.nurse.id;

		if (!nurseShiftPreferenceMap.has(nurseId)) {
			nurseShiftPreferenceMap.set(nurseId, {
				shift_off: 100,
			});
		}

		const existing = nurseShiftPreferenceMap.get(nurseId)!;

		existing[shiftId] = weight;
		existing.shift_off -= weight;
	}

	// Filter out inactive nurses from the map (check both nurse.active and preference.active)
	const activeNurseIds = new Set(
		nurseShiftPreferences
			.filter((p) => p.nurse.active !== false && p.active)
			.map((p) => p.nurse.id),
	);

	console.log(
		`📊 Active nurses: ${activeNurseIds.size} / ${nurseShiftPreferenceMap.size} total`,
	);

	for (const nurseId of nurseShiftPreferenceMap.keys()) {
		if (!activeNurseIds.has(nurseId)) {
			console.log(`   Removing inactive nurse: ${nurseId}`);
			nurseShiftPreferenceMap.delete(nurseId);
		}
	}

	console.log("📋 Nurse preference map (after filtering inactive):");
	for (const [nurseId, prefs] of nurseShiftPreferenceMap.entries()) {
		console.log(`  ${nurseId}:`, prefs);
	}

	const nurses = Array.from(nurseShiftPreferenceMap.keys());

	const preferences: Record<
		string,
		{ morning: number; evening: number; night: number }
	> = {};

	const maxShiftsPerType: Record<
		string,
		{ morning: number; evening: number; night: number }
	> = {};

	for (const [nurseId, prefs] of nurseShiftPreferenceMap.entries()) {
		// Use preference weights directly
		preferences[nurseId] = {
			morning: prefs.shift_morning ?? 0,
			evening: prefs.shift_evening ?? 0,
			night: prefs.shift_night ?? 0,
		};

		// HARD CAP: percentage / 100 * totalDays = max shifts of that type
		// Use floor to be conservative - never exceed
		// If weight is 0 or not set, nurse won't get that shift type (use -1 to block completely)
		const morningWeight = prefs.shift_morning ?? 0;
		const eveningWeight = prefs.shift_evening ?? 0;
		const nightWeight = prefs.shift_night ?? 0;

		maxShiftsPerType[nurseId] = {
			morning:
				morningWeight > 0 ? Math.round((morningWeight / 100) * totalDays) : -1,
			evening:
				eveningWeight > 0 ? Math.round((eveningWeight / 100) * totalDays) : -1,
			night: nightWeight > 0 ? Math.round((nightWeight / 100) * totalDays) : -1,
		};
	}

	// Log all nurses' preferences
	console.log("📋 ALL NURSE PREFERENCES:");
	for (const [nurseId, prefs] of nurseShiftPreferenceMap.entries()) {
		console.log(
			`  ${nurseId}: morning=${prefs.shift_morning ?? 0}, evening=${prefs.shift_evening ?? 0}, night=${prefs.shift_night ?? 0}`,
		);
	}
	console.log("📋 ALL MAX SHIFTS PER TYPE:");
	for (const [nurseId, maxes] of Object.entries(maxShiftsPerType)) {
		console.log(
			`  ${nurseId}: morning=${maxes.morning}, evening=${maxes.evening}, night=${maxes.night}`,
		);
	}

	// ─────────────────────────────────────────────
	// 2. Build per-day coverage (IMPORTANT FIX)
	// ─────────────────────────────────────────────
	const coverage = buildCoverageForMonth(year, month);

	const totalRequiredShifts = coverage.reduce(
		(sum, day) => sum + day.morning + day.evening + day.night,
		0,
	);
	const maxPossiblePerNurse = Math.floor(totalDays / 7) * 6 + (totalDays % 7);
	const maxShiftsPossible = nurses.length * maxPossiblePerNurse;

	console.log(
		`📊 Solver: ${nurses.length} nurses, ${totalDays} days, ${totalRequiredShifts} shifts needed, max possible ${maxShiftsPossible}`,
	);

	if (totalRequiredShifts > maxShiftsPossible) {
		return {
			success: false,
			error: `Not enough nurses! Need ${totalRequiredShifts} shifts but only ${maxShiftsPossible} possible with ${nurses.length} nurses. Add more nurses to preferences.`,
		};
	}

	// Find all Friday indices in the month
	const fridayIndices = getFridayIndicesForMonth(year, month);
	console.log(
		`📅 Found ${fridayIndices.length} Fridays at indices: ${fridayIndices}`,
	);
	console.log("📊 Day 0 coverage:", coverage[0]);
	console.log("📊 Day 1 coverage:", coverage[1]);

	const solverPayload = {
		nurses,
		days: totalDays,
		shifts: ["morning", "evening", "night"] as const,
		preferences,
		max_shifts_per_type: maxShiftsPerType,
		coverage,
		constraints: {
			max_consecutive_nights: ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS,
			max_consecutive_days: ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_DAYS,
			min_days_off_per_week: ROSTER_CONFIG.CONSTRAINTS.MIN_DAYS_OFF_PER_WEEK,
			night_constrain: ROSTER_CONFIG.CONSTRAINTS.NIGHT_CONSTRAIN,
		},
		unavailable: {
			nurses: FRIDAY_OFF_NURSES,
			days: fridayIndices,
		},
		previous_shifts: previousShifts,
	};

	const solverResult = await runSolver(solverPayload);
	console.log(
		`🟢 Solver output: ${solverResult.success ? "success" : "failed"}`,
	);

	if (!solverResult.success) {
		// Check if it's a pre-solve validation failure
		const reason = (solverResult as any).reason;
		return {
			success: false,
			error: reason
				? `Solver failed: ${reason}`
				: "Solver couldn't find a valid roster. Try adjusting preferences to create more flexibility (ensure some shifts have buffer > 0).",
		};
	}

	const roster = solverResult.roster as SolverRoster;
	console.log(`📋 Roster has ${Object.keys(roster).length} nurses`);

	// Show workload per nurse
	const workloadByNurse: [string, number][] = [];
	for (const [nurseId, shifts] of Object.entries(roster)) {
		const worked = shifts.filter((s) => s !== "off").length;
		workloadByNurse.push([nurseId, worked]);
	}
	workloadByNurse.sort((a, b) => b[1] - a[1]);
	console.log("📊 Top 10 workloads:", workloadByNurse.slice(0, 10));

	// Debug: show first day's shifts for first 5 nurses
	const sampleNurses = Object.keys(roster).slice(0, 5);
	console.log("🔍 Day 0 (May 1) shifts:");
	for (const n of sampleNurses) {
		console.log(`  ${n}: ${roster[n]?.[0]}`);
	}

	// Debug: count non-off assignments
	let totalAssigned = 0;
	for (const shifts of Object.values(roster)) {
		totalAssigned += shifts.filter((s) => s !== "off").length;
	}
	console.log(
		`🔍 Total assigned shifts: ${totalAssigned} / ${totalRequiredShifts}`,
	);

	// Log workload per nurse
	const workloads: number[] = [];
	for (const [nurseId, shifts] of Object.entries(roster)) {
		const worked = shifts.filter((s) => s !== "off").length;
		workloads.push(worked);
		if (worked > 25)
			console.log(`⚠️ Nurse ${nurseId} has ${worked} shifts (over max!)`);
	}
	const minLoad = Math.min(...workloads);
	const maxLoad = Math.max(...workloads);
	console.log(`📊 Workload range: ${minLoad} - ${maxLoad} shifts per nurse`);

	const schedulesToCreate: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[] = [];

	for (const [nurseId, shifts] of Object.entries(roster)) {
		for (let dayIndex = 0; dayIndex < shifts.length; dayIndex++) {
			const shiftType = shifts[dayIndex]!;
			const date = new Date(Date.UTC(year, month - 1, dayIndex + 1));
			const shiftId = shiftType === "off" ? null : `shift_${shiftType}`;
			schedulesToCreate.push({ nurseId, shiftId, date });
		}
	}

	// Log first few schedules
	const firstFew = schedulesToCreate.slice(0, 10);
	console.log(
		"📝 Sample schedules:",
		firstFew.map(
			(s) =>
				`${s.nurseId}: ${s.date.toISOString().split("T")[0]} = ${s.shiftId}`,
		),
	);

	// Check if there's actually shifts
	const nonOffCount = schedulesToCreate.filter(
		(s) => s.shiftId !== null,
	).length;
	console.log(`⚠️ Non-off shifts: ${nonOffCount}`);

	// Debug: count by date
	const byDate = new Map<string, number>();
	for (const s of schedulesToCreate) {
		const dateKey = s.date.toISOString().split("T")[0]!;
		if (s.shiftId !== null) {
			byDate.set(dateKey, (byDate.get(dateKey) || 0) + 1);
		}
	}
	console.log("📅 Shifts by date:", Object.fromEntries(byDate));

	const nonNull = schedulesToCreate.filter((s) => s.shiftId !== null).length;
	console.log(
		`💾 Creating ${schedulesToCreate.length} schedules (${nonNull} with shifts)...`,
	);
	await rosterDb.createSchedules(schedulesToCreate);
	console.log("✅ Done!");

	return {
		success: true,
		roster,
	};
}
