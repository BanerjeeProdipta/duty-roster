import { db } from "@Duty-Roster/db";
import { nurse } from "@Duty-Roster/db/schema/nurse";
import { tool } from "@langchain/core/tools";

export const listNursesTool = tool(
	async () => {
		const nurses = await db
			.select({ name: nurse.name, active: nurse.active })
			.from(nurse)
			.orderBy(nurse.active);

		const active = nurses
			.filter((n) => n.active)
			.map((n) => n.name)
			.join(", ");
		return `Active nurses: ${active}`;
	},
	{
		name: "listNurses",
		description:
			"List all active nurses for name reference. No arguments needed.",
	},
);
