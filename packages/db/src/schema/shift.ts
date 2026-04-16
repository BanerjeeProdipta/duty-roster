import { boolean, pgEnum, pgTable, text, time } from "drizzle-orm/pg-core";

export const SHIFT_VALUES = ["morning", "evening", "night"] as const;
export const shiftEnum = pgEnum("shift_enum", SHIFT_VALUES);

export const shift = pgTable("shift", {
	id: text("id").primaryKey(),
	name: shiftEnum("name").notNull().unique(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),

	crossesMidnight: boolean("crosses_midnight").notNull(),
});
