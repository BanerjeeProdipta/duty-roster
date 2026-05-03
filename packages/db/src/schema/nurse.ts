import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nurseSchedule } from "./nurse-schedule";

export const nurse = pgTable("nurse", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	active: boolean("active").notNull().default(true),

	createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nurseRelations = relations(nurse, ({ many }) => ({
	schedules: many(nurseSchedule),
}));
