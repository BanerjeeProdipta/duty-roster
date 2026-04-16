import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { shift } from "./shift";

export const userSchedule = pgTable(
	"user_schedule",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),
		shiftId: text("shift_id")
			.notNull()
			.references(() => shift.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => ({
		uniqueUserPerDay: uniqueIndex("uniq_user_day").on(table.userId, table.date),
	}),
);

export const userScheduleRelations = relations(userSchedule, ({ one }) => ({
	user: one(user, {
		fields: [userSchedule.userId],
		references: [user.id],
	}),
	shift: one(shift, {
		fields: [userSchedule.shiftId],
		references: [shift.id],
	}),
}));
