import { spawn } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as rosterDb from "../db/roster";

type GenerateRosterParams = {
	year: number;
	month: number;
};

function getDateKey(date: Date | string) {
	if (typeof date === "string") return date;
	return date.toISOString().split("T")[0] ?? "";
}

function getSolverNurseKey(index: number) {
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
	const dailyShiftCountsMap = new Map<any, any>();
	const nurseShiftCountsMap = new Map<any, any>();

	for (const schedule of schedules) {
		const dateKey = schedule.date;
		const shiftId = schedule.shift?.id;

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

		if (shiftId === "morning" || shiftId === "evening" || shiftId === "night") {
			dailyCounts[shiftId]++;
			dailyCounts.totalAssigned++;

			nurseCounts.shifts[shiftId]++;
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

export async function generateRoster(params: GenerateRosterParams) {
	try {
		const nurseCount = (await getNurses()).length;
		const shifts = await getShifts();
		console.log({
			nurseCount,
			shifts,
		});
	} catch {}
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

			acc[nurseId][shiftKey] = row.weight;

			return acc;
		},
		{} as Record<string, any>,
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
