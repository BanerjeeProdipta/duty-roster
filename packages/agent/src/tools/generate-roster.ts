import { generateRoster } from "@Duty-Roster/api/roster/service";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const MONTH_NAMES = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
];

export const generateRosterTool = tool(
	async ({ year, month }) => {
		try {
			await generateRoster({ year, month });
			return `Generated the roster for ${MONTH_NAMES[month - 1]} ${year}.`;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return `Failed to generate roster for ${MONTH_NAMES[month - 1]} ${year}: ${message}`;
		}
	},
	{
		name: "generateRoster",
		description:
			"Generate the full duty roster for an entire month, assigning all nurses' shifts for every day. Use this when the user asks to generate, create, or build the roster for a month (no specific date needed).",
		schema: z.object({
			year: z.number().int().describe("Four-digit year, e.g. 2026"),
			month: z.number().int().min(1).max(12).describe("Month number, 1-12"),
		}),
	},
);
