import { db } from "@Duty-Roster/db";
import { nurse } from "@Duty-Roster/db/schema/nurse";
import { nurseSchedule } from "@Duty-Roster/db/schema/nurse-schedule";
import { shift } from "@Duty-Roster/db/schema/shift";
import { bestNameMatch, formatTime12h } from "@Duty-Roster/ai-parser";
import { tool } from "@langchain/core/tools";
import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";

async function lookupSchedule(nurseName: string, dateKey: string) {
	const nurseRow = await db
		.select()
		.from(nurse)
		.where(eq(nurse.name, nurseName))
		.limit(1);

	if (!nurseRow[0]) return null;

	const schedule = await db
		.select({
			shiftName: shift.name,
			shiftStart: shift.startTime,
			shiftEnd: shift.endTime,
		})
		.from(nurseSchedule)
		.leftJoin(shift, eq(nurseSchedule.shiftId, shift.id))
		.where(
			and(
				eq(nurseSchedule.nurseId, nurseRow[0].id),
				sql`DATE(${nurseSchedule.date}) = ${dateKey}`,
			),
		)
		.limit(1);

	return schedule[0] ?? null;
}

export const queryScheduleTool = tool(
	async ({ nurseName, dateKey }) => {
		let resolvedName = nurseName;
		let sched = await lookupSchedule(resolvedName, dateKey);

		if (!sched) {
			const words = nurseName
				.toLowerCase()
				.replace(/[.,!?;:]/g, "")
				.split(/\s+/)
				.filter(Boolean);
			const bn = bestNameMatch(words);
			if (bn) {
				resolvedName = bn;
				sched = await lookupSchedule(resolvedName, dateKey);
			}
		}

		if (!sched) {
			const allNurses = await db
				.select({ name: nurse.name })
				.from(nurse)
				.where(eq(nurse.active, true));
			const names = allNurses.map((n) => n.name).join(", ");
			return `Nurse "${nurseName}" not found. Active nurses: ${names}`;
		}

		if (!sched.shiftName) {
			return `${resolvedName} has no shift (OFF) on ${dateKey}`;
		}

		const startTime = formatTime12h(sched.shiftStart);
		const endTime = formatTime12h(sched.shiftEnd);

		return `${resolvedName} is on ${sched.shiftName} shift (${startTime}-${endTime}) on ${dateKey}`;
	},
	{
		name: "querySchedule",
		description:
			"Get a nurse's shift assignment for a specific date. Returns the shift type and timing if assigned, or OFF if no shift.",
		schema: z.object({
			nurseName: z
				.string()
				.describe("Nurse name in Bengali or English"),
			dateKey: z.string().describe("Date in YYYY-MM-DD format"),
		}),
	},
);
