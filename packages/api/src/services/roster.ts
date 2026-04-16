import { exec } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import * as rosterDb from "../db/roster";

const execAsync = promisify(exec);

type GenerateRosterParams = {
	year: number;
	month: number;
};

type ScheduleRow = Awaited<
	ReturnType<typeof rosterDb.findSchedulesByDateRange>
>[number];

function getDateKey(date: Date) {
	return date.toISOString().split("T")[0] ?? "";
}

export function buildScheduleSummary(schedules: ScheduleRow[]) {
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
		const dateKey = getDateKey(schedule.date);
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
			dailyCounts[shiftId] += 1;
			dailyCounts.totalAssigned += 1;
			nurseCounts.shifts[shiftId] += 1;
			nurseCounts.shifts.totalAssigned += 1;
		}

		dailyShiftCountsMap.set(dateKey, dailyCounts);
		nurseShiftCountsMap.set(schedule.nurse.id, nurseCounts);
	}

	return {
		schedules,
		dailyShiftCounts: Array.from(dailyShiftCountsMap.entries())
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([date, shifts]) => ({
				date,
				shifts,
			})),
		nurseShiftCounts: Array.from(nurseShiftCountsMap.values()).sort(
			(left, right) => left.nurse.name.localeCompare(right.nurse.name),
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

	return buildScheduleSummary(schedules);
}

export async function generateRoster(params: GenerateRosterParams) {
	try {
		const __filename = fileURLToPath(import.meta.url);
		const __dirname = dirname(__filename);

		const solverPath = join(__dirname, "../../../../apps/server/src/solver.py");

		const { stdout } = await execAsync(
			`python3 ${solverPath} '${JSON.stringify(params)}'`,
		);

		const data = JSON.parse(stdout);

		if (!data?.schedules) throw new Error("Invalid solver output");

		const shifts = await rosterDb.findAllShifts();
		const shiftMap = new Map(shifts.map((s) => [s.name, s.id]));

		const formatted = data.schedules.map((s: any, i: number) => {
			const date = new Date(params.year, params.month - 1, s.day);

			const shiftId = shiftMap.get(s.shift);

			if (!shiftId) {
				throw new Error(`Invalid shift from solver: ${s.shift}`);
			}

			return {
				id: `schedule_${Date.now()}_${i}`,
				nurseId: s.nurseId,
				shiftId,
				date,
			};
		});

		await rosterDb.createSchedules(formatted);

		return {
			success: true,
			total: formatted.length,
		};
	} catch (err: any) {
		return {
			success: false,
			error: err.message,
			stack: err.stack,
		};
	}
}
