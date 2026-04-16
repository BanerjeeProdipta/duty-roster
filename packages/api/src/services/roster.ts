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

export async function getNurses() {
	return rosterDb.findAllNurses();
}

export async function getShifts() {
	return rosterDb.findAllShifts();
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
