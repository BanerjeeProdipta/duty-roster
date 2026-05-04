import { relations } from "drizzle-orm/relations";
import {
	account,
	nurse,
	nurseSchedule,
	nurseShiftPreference,
	session,
	shift,
	user,
} from "./schema";

export const accountRelations = relations(account, ({ one }) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id],
	}),
}));

export const userRelations = relations(user, ({ many }) => ({
	accounts: many(account),
	sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

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

export const nurseRelations = relations(nurse, ({ many }) => ({
	nurseSchedules: many(nurseSchedule),
	nurseShiftPreferences: many(nurseShiftPreference),
}));

export const shiftRelations = relations(shift, ({ many }) => ({
	nurseSchedules: many(nurseSchedule),
	nurseShiftPreferences: many(nurseShiftPreference),
}));

export const nurseShiftPreferenceRelations = relations(
	nurseShiftPreference,
	({ one }) => ({
		nurse: one(nurse, {
			fields: [nurseShiftPreference.nurseId],
			references: [nurse.id],
		}),
		shift: one(shift, {
			fields: [nurseShiftPreference.shiftId],
			references: [shift.id],
		}),
	}),
);
