import { pgEnum, pgTable, text, time } from "drizzle-orm/pg-core";

export const shiftEnum = pgEnum("shift_enum", ["morning", "evening", "night"]);

export const shift = pgTable("shift", {
	id: text("id").primaryKey(),
	name: shiftEnum("name").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
});
