import { db } from "@Duty-Roster/db";
import { nurse } from "@Duty-Roster/db/schema/nurse";
import { nurseSchedule } from "@Duty-Roster/db/schema/nurse-schedule";
import { shift } from "@Duty-Roster/db/schema/shift";
import { tool } from "@langchain/core/tools";
import { and, eq, sql } from "drizzle-orm";
import * as z from "zod";

export const queryShiftTool = tool(
	async ({ dateKey, shiftName }) => {
		const nurseRows = await db
			.select({ name: nurse.name })
			.from(nurseSchedule)
			.innerJoin(nurse, eq(nurseSchedule.nurseId, nurse.id))
			.innerJoin(shift, eq(nurseSchedule.shiftId, shift.id))
			.where(
				and(
					sql`DATE(${nurseSchedule.date}) = ${dateKey}`,
					sql`${shift.name} = ${shiftName}`,
				),
			)
			.orderBy(nurse.name);

		if (!nurseRows.length) {
			return `No nurses are on the ${shiftName} shift on ${dateKey}.`;
		}

		const names = nurseRows.map((n) => n.name).join(", ");
		return `The following nurses are on ${shiftName} shift on ${dateKey}: ${names}`;
	},
	{
		name: "queryShift",
		description:
			"Get all nurses assigned to a specific shift on a specific date. Use this when asked who is on a particular shift (morning/evening/night) on a given day.",
		schema: z.object({
			dateKey: z.string().describe("Date in YYYY-MM-DD format"),
			shiftName: z.string().describe("Shift name: morning, evening, or night"),
		}),
	},
);
