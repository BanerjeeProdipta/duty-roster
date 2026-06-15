import * as rosterDb from "./db";
import type { SchedulesResponse } from "./schema";

import {
	buildCoverageForMonth,
	FRIDAY_OFF_NURSES,
	getDaysCountFromStartAndEndDate,
	getDaysInMonth,
	getFridayIndicesForMonth,
	getShiftRequirementsForRange,
	normalizeDateKey,
	ROSTER_CONFIG,
	runSolver,
	type ShiftTypeKey,
	type ShiftUpdateResult,
	shiftIdToShiftType,
} from "./utils";

type SolverRoster = Record<string, string[]>;

export async function createNurse({
	name,
	morning,
	evening,
	night,
}: {
	name: string;
	morning: number;
	evening: number;
	night: number;
}) {
	const id = `nurse_${crypto.randomUUID().slice(0, 8)}`;
	const preferences = [
		{ shiftId: "shift_morning", weight: morning },
		{ shiftId: "shift_evening", weight: evening },
		{ shiftId: "shift_night", weight: night },
	];
	await rosterDb.createNurse(id, name, preferences);
	return { id, name };
}

export { FRIDAY_OFF_NURSES, ROSTER_CONFIG } from "./utils";
export type { ShiftTypeKey, ShiftUpdateResult };

// ───────────── PREFERENCES (merged logic) ─────────────

export async function deleteNurse(nurseId: string) {
	await rosterDb.deleteNurse(nurseId);
}

export async function updateNurse({
	nurseId,
	name,
	active,
	designation,
	sortOrder,
}: {
	nurseId: string;
	name?: string;
	active?: boolean;
	designation?: string;
	sortOrder?: number;
}) {
	console.log("📝 updateNurse called:", {
		nurseId,
		name,
		active,
		designation,
		sortOrder,
	});
	const data: {
		name?: string;
		active?: boolean;
		designation?: string;
		sortOrder?: number;
	} = {};
	if (name !== undefined) data.name = name;
	if (active !== undefined) data.active = active;
	if (designation !== undefined) data.designation = designation;
	if (sortOrder !== undefined) data.sortOrder = sortOrder;
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

const DEFAULT_PREFERENCES_CSV = `"nurse_id","shift_id","weight","active"
"nurse_1","shift_evening","0","true"
"nurse_1","shift_morning","81","true"
"nurse_1","shift_night","0","true"
"nurse_10","shift_evening","0","true"
"nurse_10","shift_morning","68","true"
"nurse_10","shift_night","10","true"
"nurse_11","shift_evening","0","true"
"nurse_11","shift_morning","68","true"
"nurse_11","shift_night","10","true"
"nurse_12","shift_evening","13","true"
"nurse_12","shift_morning","55","true"
"nurse_12","shift_night","10","true"
"nurse_13","shift_evening","0","true"
"nurse_13","shift_morning","68","true"
"nurse_13","shift_night","10","true"
"nurse_14","shift_evening","0","true"
"nurse_14","shift_morning","68","true"
"nurse_14","shift_night","10","true"
"nurse_15","shift_evening","0","true"
"nurse_15","shift_morning","81","true"
"nurse_15","shift_night","0","true"
"nurse_16","shift_evening","13","true"
"nurse_16","shift_morning","55","true"
"nurse_16","shift_night","10","true"
"nurse_17","shift_evening","0","true"
"nurse_17","shift_morning","68","true"
"nurse_17","shift_night","10","true"
"nurse_18","shift_evening","10","true"
"nurse_18","shift_morning","65","true"
"nurse_18","shift_night","6","true"
"nurse_19","shift_evening","10","true"
"nurse_19","shift_morning","65","true"
"nurse_19","shift_night","6","true"
"nurse_2","shift_evening","0","true"
"nurse_2","shift_morning","81","true"
"nurse_2","shift_night","0","true"
"nurse_20","shift_evening","68","true"
"nurse_20","shift_morning","0","true"
"nurse_20","shift_night","10","true"
"nurse_21","shift_evening","13","true"
"nurse_21","shift_morning","55","true"
"nurse_21","shift_night","10","true"
"nurse_22","shift_evening","13","true"
"nurse_22","shift_morning","55","true"
"nurse_22","shift_night","10","true"
"nurse_23","shift_evening","0","true"
"nurse_23","shift_morning","68","true"
"nurse_23","shift_night","10","true"
"nurse_24","shift_evening","6","true"
"nurse_24","shift_morning","61","true"
"nurse_24","shift_night","10","true"
"nurse_25","shift_evening","0","true"
"nurse_25","shift_morning","68","true"
"nurse_25","shift_night","10","true"
"nurse_26","shift_evening","68","true"
"nurse_26","shift_morning","0","true"
"nurse_26","shift_night","10","true"
"nurse_27","shift_evening","0","true"
"nurse_27","shift_morning","81","true"
"nurse_27","shift_night","0","true"
"nurse_28","shift_evening","0","true"
"nurse_28","shift_morning","81","true"
"nurse_28","shift_night","0","true"
"nurse_29","shift_evening","13","true"
"nurse_29","shift_morning","55","true"
"nurse_29","shift_night","10","true"
"nurse_3","shift_evening","0","true"
"nurse_3","shift_morning","68","true"
"nurse_3","shift_night","10","true"
"nurse_30","shift_evening","0","true"
"nurse_30","shift_morning","68","true"
"nurse_30","shift_night","10","true"
"nurse_31","shift_evening","68","true"
"nurse_31","shift_morning","0","true"
"nurse_31","shift_night","10","true"
"nurse_32","shift_evening","0","true"
"nurse_32","shift_morning","81","true"
"nurse_32","shift_night","0","true"
"nurse_4","shift_evening","0","true"
"nurse_4","shift_morning","68","true"
"nurse_4","shift_night","10","true"
"nurse_5","shift_evening","0","true"
"nurse_5","shift_morning","81","true"
"nurse_5","shift_night","0","true"
"nurse_6","shift_evening","13","true"
"nurse_6","shift_morning","68","true"
"nurse_6","shift_night","0","true"
"nurse_7","shift_evening","0","true"
"nurse_7","shift_morning","71","true"
"nurse_7","shift_night","6","true"
"nurse_8","shift_evening","0","true"
"nurse_8","shift_morning","81","true"
"nurse_8","shift_night","0","true"
"nurse_9","shift_evening","13","true"
"nurse_9","shift_morning","55","true"
"nurse_9","shift_night","10","true"`;

type CsvPreference = {
	nurse_id: string;
	shift_id: string;
	weight: number;
	active: boolean;
};

type NurseShiftPreference = {
	nurseId: string;
	shiftId: string;
	weight: number;
	active: boolean;
};

const SHIFT_TYPES = ["shift_morning", "shift_evening", "shift_night"] as const;

function parseCsvPreferences(csv: string): CsvPreference[] {
	const lines = csv.trim().split("\n");
	const preferences: CsvPreference[] = [];

	for (let i = 1; i < lines.length; i++) {
		const match = lines[i].match(/"([^"]+)","([^"]+)","([^"]+)","([^"]+)"/);
		if (!match) continue;

		preferences.push({
			nurse_id: match[1],
			shift_id: match[2],
			weight: Number.parseInt(match[3], 10),
			active: match[4] === "true",
		});
	}

	return preferences;
}

function buildNursePreferences(
	nurse: { id: string },
	nursePrefs: CsvPreference[],
): NurseShiftPreference[] {
	return SHIFT_TYPES.map((shiftId) => {
		const pref = nursePrefs.find((p) => p.shift_id === shiftId);
		return {
			nurseId: nurse.id,
			shiftId,
			weight: pref?.weight ?? 0,
			active: pref?.active ?? true,
		};
	});
}

export async function prefillDefault(
	year: number,
	month: number,
): Promise<{ success: boolean; updated: number }> {
	const totalDays = getDaysInMonth(year, month);
	const allNurses = await rosterDb.findAllNurses();
	const activeNurses = allNurses.filter((n) => n.active !== false);

	if (activeNurses.length === 0) {
		return { success: false, updated: 0 };
	}

	const csvPreferences = parseCsvPreferences(DEFAULT_PREFERENCES_CSV);

	const preferences = activeNurses.flatMap((nurse) => {
		const nursePrefs = csvPreferences.filter((p) => p.nurse_id === nurse.id);
		return buildNursePreferences(nurse, nursePrefs);
	});

	await rosterDb.upsertNurseShiftPreferences(preferences, totalDays);
	return { success: true, updated: activeNurses.length };
}
// ───────────── SCHEDULES ─────────────

export async function getShifts() {
	return rosterDb.findAllShifts();
}

/**
 * Fetches schedules and preferences for a date range and computes aggregated metrics.
 * Supports optional pagination via `page` and `pageSize` params (1-indexed).
 */
export async function getSchedulesByDateRange(
	startDate: Date,
	endDate: Date,
	page?: number,
	pageSize?: number,
	searchQuery?: string,
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

	const [rows, aggregateStats, totalNurses, activeNurses] = await Promise.all([
		rosterDb.findSchedulesAndPreferencesByDateRange(
			startDate,
			endDate,
			page,
			pageSize,
			searchQuery,
		),
		rosterDb.getRosterAggregateStats(
			startStr,
			endStr,
			searchQuery,
			getDaysCountFromStartAndEndDate(startDate, endDate),
		),
		rosterDb.countAllNurses(searchQuery),
		rosterDb.countActiveNurses(searchQuery),
	]);

	const { dailyShiftCounts, assignedShiftCounts, preferenceCapacity } =
		aggregateStats;

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

		// Force pref-off to be exactly MAX_PREF_OFF regardless of CSV weights.
		// Distribute the remaining days to morning/evening/night pref counts.
		const MAX_PREF_OFF = 5;
		const desiredPrefTotal = Math.max(0, totalDays - MAX_PREF_OFF);

		// Start with evening/night as-is, let morning absorb the remainder.
		let adjPrefEvening = preferenceEvening;
		let adjPrefNight = preferenceNight;
		let adjPrefMorning = Math.max(
			0,
			desiredPrefTotal - (adjPrefEvening + adjPrefNight),
		);

		// If evening+night already exceed desired total, scale them down proportionally
		// and set morning to whatever remains (may be zero).
		const sumEN = preferenceEvening + preferenceNight;
		if (sumEN > desiredPrefTotal && sumEN > 0) {
			const scale = desiredPrefTotal / sumEN;
			// Use Math.floor to avoid exceeding desired total, then assign leftover to morning
			adjPrefEvening = Math.floor(preferenceEvening * scale);
			adjPrefNight = Math.floor(preferenceNight * scale);
			adjPrefMorning = Math.max(
				0,
				desiredPrefTotal - (adjPrefEvening + adjPrefNight),
			);
		}

		return {
			nurse: {
				id: row.id as string,
				name: row.name as string,
				active: row.active as boolean,
				designation: (row as any).designation ?? undefined,
				sortOrder: (row as any).sortOrder ?? undefined,
			},
			assignedShiftMetrics: {
				morning: Number(row.shiftMorning),
				evening: Number(row.shiftEvening),
				night: Number(row.shiftNight),
				total: Number(row.totalAssigned),
			},
			assignments,
			preferenceWiseShiftMetrics: {
				morning: adjPrefMorning,
				evening: adjPrefEvening,
				night: adjPrefNight,
				total: adjPrefMorning + adjPrefEvening + adjPrefNight,
			},
		};
	});

	const shiftRequirements = {
		...getShiftRequirementsForRange(startDate, endDate),
		total: 0,
	};
	shiftRequirements.total =
		shiftRequirements.morning +
		shiftRequirements.evening +
		shiftRequirements.night;

	// ─────────────── PAGINATION ───────────────
	const pagination =
		page !== undefined && pageSize !== undefined
			? {
					page,
					pageSize,
					total: totalNurses,
					totalPages: Math.max(1, Math.ceil(totalNurses / pageSize)),
				}
			: undefined;

	return {
		nurseRows,
		dailyShiftCounts,
		shiftRequirements,
		assignedShiftCounts,
		preferenceCapacity,
		nurseCounts: {
			total: totalNurses,
			active: activeNurses,
		},
		pagination,
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

	const maxShiftsPerType: Record<string, Record<string, number>> = {};

	for (const [nurseId, prefs] of nurseShiftPreferenceMap.entries()) {
		// Use preference weights directly
		preferences[nurseId] = {
			morning: prefs.shift_morning ?? 0,
			evening: prefs.shift_evening ?? 0,
			night: prefs.shift_night ?? 0,
		};

		// Only set a per-shift-type cap when weight > 0.
		// Nurses with 0% weight are unblocked — they can fill coverage gaps
		// when the exact-equality preference constraints are applied for other nurses.
		const morningWeight = prefs.shift_morning ?? 0;
		const eveningWeight = prefs.shift_evening ?? 0;
		const nightWeight = prefs.shift_night ?? 0;

		const caps: Record<string, number> = {};
		if (morningWeight > 0)
			caps.morning = Math.round((morningWeight / 100) * totalDays);
		if (eveningWeight > 0)
			caps.evening = Math.round((eveningWeight / 100) * totalDays);
		if (nightWeight > 0)
			caps.night = Math.round((nightWeight / 100) * totalDays);
		maxShiftsPerType[nurseId] = caps;
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
