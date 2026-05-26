import { db } from "@Duty-Roster/db";
import { nurse } from "@Duty-Roster/db/schema/nurse";
import { nurseSchedule } from "@Duty-Roster/db/schema/nurse-schedule";
import { shift } from "@Duty-Roster/db/schema/shift";
import { tool } from "@langchain/core/tools";
import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";

export const queryScheduleTool = tool(
	async ({ nurseName, dateKey }) => {
		const nurseRow = await db
			.select()
			.from(nurse)
			.where(eq(nurse.name, nurseName))
			.limit(1);

		if (!nurseRow.length) {
			const allNurses = await db
				.select({ name: nurse.name })
				.from(nurse)
				.where(eq(nurse.active, true));
			const names = allNurses.map((n) => n.name).join(", ");
			return `Nurse "${nurseName}" not found. Active nurses: ${names}`;
		}

		const date = new Date(dateKey);
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

		if (!schedule.length || !schedule[0].shiftName) {
			return `${nurseName} has no shift (OFF) on ${dateKey}`;
		}

		const s = schedule[0];
		return `${nurseName} is on ${s.shiftName} shift (${s.shiftStart}-${s.shiftEnd}) on ${dateKey}`;
	},
	{
		name: "querySchedule",
		description:
			"Get a nurse's shift assignment for a specific date. Returns the shift type and timing if assigned, or OFF if no shift.",
		schema: z.object({
			nurseName: z
				.string()
				.describe("Full nurse name (e.g. Joysree, Margaret)"),
			dateKey: z.string().describe("Date in YYYY-MM-DD format"),
		}),
	},
);
