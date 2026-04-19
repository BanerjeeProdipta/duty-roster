import {
	boolean,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { nurse } from "./nurse";
import { shift } from "./shift";

export const nurseShiftPreference = pgTable(
	"nurse_shift_preference",
	{
		nurseId: text("nurse_id")
			.notNull()
			.references(() => nurse.id),

		shiftId: text("shift_id")
			.notNull()
			.references(() => shift.id),

		weight: integer("weight").notNull(),

		active: boolean("active").notNull().default(true),
	},
	(t) => ({
		pk: primaryKey(t.nurseId, t.shiftId),
	}),
);
