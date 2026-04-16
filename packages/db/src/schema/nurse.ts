import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nurseSchedule } from "./nurse-schedule";
import { shift } from "./shift";

export const nurse = pgTable("nurse", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),

	// nullable = no preference
	preferredShiftId: text("preferred_shift_id").references(() => shift.id),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nurseRelations = relations(nurse, ({ one, many }) => ({
	preferredShift: one(shift, {
		fields: [nurse.preferredShiftId],
		references: [shift.id],
	}),
	schedules: many(nurseSchedule),
}));
