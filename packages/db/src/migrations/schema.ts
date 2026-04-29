import {
	boolean,
	foreignKey,
	index,
	integer,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	time,
	timestamp,
	unique,
	uniqueIndex,
} from "drizzle-orm/pg-core";

export const shiftEnum = pgEnum("shift_enum", ["morning", "evening", "night"]);

export const verification = pgTable(
	"verification",
	{
		id: text().primaryKey().notNull(),
		identifier: text().notNull(),
		value: text().notNull(),
		expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("verification_identifier_idx").using(
			"btree",
			table.identifier.asc().nullsLast().op("text_ops"),
		),
	],
);

export const account = pgTable(
	"account",
	{
		id: text().primaryKey().notNull(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			mode: "string",
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			mode: "string",
		}),
		scope: text(),
		password: text(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
	},
	(table) => [
		index("account_userId_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_user_id_user_id_fk",
		}).onDelete("cascade"),
	],
);

export const session = pgTable(
	"session",
	{
		id: text().primaryKey().notNull(),
		expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
		token: text().notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id").notNull(),
	},
	(table) => [
		index("session_userId_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_user_id_user_id_fk",
		}).onDelete("cascade"),
		unique("session_token_unique").on(table.token),
	],
);

export const nurse = pgTable("nurse", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
});

export const shift = pgTable(
	"shift",
	{
		id: text().primaryKey().notNull(),
		name: shiftEnum().notNull(),
		startTime: time("start_time").notNull(),
		endTime: time("end_time").notNull(),
		crossesMidnight: boolean("crosses_midnight").notNull(),
	},
	(table) => [unique("shift_name_unique").on(table.name)],
);

export const nurseSchedule = pgTable(
	"nurse_schedule",
	{
		id: text().primaryKey().notNull(),
		nurseId: text("nurse_id").notNull(),
		date: timestamp({ mode: "string" }).notNull(),
		shiftId: text("shift_id"),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("idx_nurse_schedule_date").using(
			"btree",
			table.date.asc().nullsLast().op("timestamp_ops"),
		),
		uniqueIndex("uniq_nurse_day").using(
			"btree",
			table.nurseId.asc().nullsLast().op("text_ops"),
			table.date.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.nurseId],
			foreignColumns: [nurse.id],
			name: "nurse_schedule_nurse_id_nurse_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.shiftId],
			foreignColumns: [shift.id],
			name: "nurse_schedule_shift_id_shift_id_fk",
		}).onDelete("set null"),
	],
);

export const user = pgTable(
	"user",
	{
		id: text().primaryKey().notNull(),
		name: text().notNull(),
		email: text().notNull(),
		emailVerified: boolean("email_verified").default(false).notNull(),
		createdAt: timestamp("created_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { mode: "string" })
			.defaultNow()
			.notNull(),
		image: text(),
		role: text().default("user").notNull(),
	},
	(table) => [unique("user_email_unique").on(table.email)],
);

export const nurseShiftPreference = pgTable(
	"nurse_shift_preference",
	{
		nurseId: text("nurse_id").notNull(),
		shiftId: text("shift_id").notNull(),
		weight: integer().notNull(),
		active: boolean().default(true).notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.nurseId],
			foreignColumns: [nurse.id],
			name: "nurse_shift_preference_nurse_id_nurse_id_fk",
		}),
		foreignKey({
			columns: [table.shiftId],
			foreignColumns: [shift.id],
			name: "nurse_shift_preference_shift_id_shift_id_fk",
		}),
		primaryKey({
			columns: [table.nurseId, table.shiftId],
			name: "nurse_shift_preference_nurse_id_shift_id_pk",
		}),
	],
);
