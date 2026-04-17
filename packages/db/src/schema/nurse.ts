import { relations } from "drizzle-orm";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nurseSchedule } from "./nurse-schedule";

export const nurse = pgTable("nurse", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nurseRelations = relations(nurse, ({ many }) => ({
	schedules: many(nurseSchedule),
}));
