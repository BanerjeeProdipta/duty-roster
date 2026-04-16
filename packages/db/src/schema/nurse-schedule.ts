import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { nurse } from "./nurse";
import { shift } from "./shift";

export const nurseSchedule = pgTable(
	"nurse_schedule",
	{
		id: text("id").primaryKey(),

		nurseId: text("nurse_id")
			.notNull()
			.references(() => nurse.id, { onDelete: "cascade" }),

		date: timestamp("date").notNull(),

		// ✅ nullable = OFF day
		shiftId: text("shift_id").references(() => shift.id, {
			onDelete: "set null",
		}),

		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		uniqueNursePerDay: uniqueIndex("uniq_nurse_day").on(
			table.nurseId,
			table.date,
		),
	}),
);

export const nurseScheduleRelations = relations(nurseSchedule, ({ one }) => ({
	nurse: one(nurse, {
		fields: [nurseSchedule.nurseId],
		references: [nurse.id],
	}),
	shift: one(shift, {
		fields: [nurseSchedule.shiftId],
		references: [shift.id],
	}),
}));
