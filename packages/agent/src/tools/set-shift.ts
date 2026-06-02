import { bestNameMatch } from "@Duty-Roster/ai-parser";
import { db, schema } from "@Duty-Roster/db";
import { tool } from "@langchain/core/tools";
import { eq } from "drizzle-orm";
import * as z from "zod";

const { nurse, nurseSchedule } = schema;

export const setShiftTool = tool(
	async ({ nurseName, shiftName, dateKey }) => {
		const targetShift = shiftName === "off" ? null : `shift_${shiftName}`;

		if (
			shiftName !== "off" &&
			!["shift_morning", "shift_evening", "shift_night"].includes(targetShift!)
		) {
			return `Invalid shift "${shiftName}". Valid shifts: morning, evening, night, off.`;
		}

		let resolvedName = nurseName;
		let nurseRow = await db
			.select({ id: nurse.id, name: nurse.name })
			.from(nurse)
			.where(eq(nurse.name, resolvedName))
			.limit(1);

		if (!nurseRow[0]) {
			const words = nurseName
				.toLowerCase()
				.replace(/[.,!?;:]/g, "")
				.split(/\s+/)
				.filter(Boolean);
			const bn = bestNameMatch(words);
			if (bn) {
				resolvedName = bn;
				nurseRow = await db
					.select({ id: nurse.id, name: nurse.name })
					.from(nurse)
					.where(eq(nurse.name, resolvedName))
					.limit(1);
			}
		}

		if (!nurseRow[0]) {
			const allNurses = await db
				.select({ name: nurse.name })
				.from(nurse)
				.where(eq(nurse.active, true));
			const names = allNurses.map((n) => n.name).join(", ");
			return `Nurse "${nurseName}" not found. Active nurses: ${names}`;
		}

		const nid = nurseRow[0].id;
		const scheduleId = `schedule_${nid}_${dateKey}`;
		const targetDate = new Date(`${dateKey}T00:00:00.000Z`);

		await db
			.insert(nurseSchedule)
			.values({
				id: scheduleId,
				nurseId: nid,
				date: targetDate,
				shiftId: targetShift,
			})
			.onConflictDoUpdate({
				target: [nurseSchedule.nurseId, nurseSchedule.date],
				set: { shiftId: targetShift },
			});

		const shiftLabel = shiftName === "off" ? "OFF" : `${shiftName}`;
		return `Updated: ${resolvedName} is now assigned to ${shiftLabel} on ${dateKey}.`;
	},
	{
		name: "setShift",
		description:
			"Assign or update a nurse's shift for a specific date. Use this when the user wants to set, assign, change, or update a nurse's shift.",
		schema: z.object({
			nurseName: z.string().describe("Nurse name in Bengali or English"),
			shiftName: z
				.string()
				.describe("Shift to assign: morning, evening, night, or off"),
			dateKey: z.string().describe("Date in YYYY-MM-DD format"),
		}),
	},
);
