import { db, schema } from "@Duty-Roster/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";

const { nurse, nurseSchedule, shift, nurseShiftPreference } = schema;

import { createUTCDate, getMonthDateRange } from "../utils/roster";

// ─────────────── NURSES ───────────────

export async function findAllNurses() {
	return db.select().from(nurse).orderBy(nurse.name);
}

// ─────────────── SHIFTS ───────────────

export async function findAllShifts() {
	return db.select().from(shift);
}

// ─────────────── SCHEDULES ───────────────

export async function findSchedulesByDateRange(startDate: Date, endDate: Date) {
	const start = new Date(startDate);
	start.setUTCHours(0, 0, 0, 0);
	const end = new Date(endDate);
	end.setUTCHours(23, 59, 59, 999);

	return db
		.select({
			id: nurseSchedule.id,
			date: nurseSchedule.date,
			nurse: {
				id: nurse.id,
				name: nurse.name,
			},
			shift: {
				id: shift.id,
			},
		})
		.from(nurse)
		.leftJoin(
			nurseSchedule,
			and(
				eq(nurse.id, nurseSchedule.nurseId),
				sql`${nurseSchedule.date} >= ${start}`,
				sql`${nurseSchedule.date} <= ${end}`,
			),
		)
		.leftJoin(shift, eq(shift.id, nurseSchedule.shiftId))
		.orderBy(nurse.name, nurseSchedule.date);
}

export async function createSchedules(
	schedules: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[],
) {
	if (schedules.length === 0) return;

	const firstSchedule = schedules.at(0);
	if (!firstSchedule) return;

	const year = firstSchedule.date.getUTCFullYear();
	const month = firstSchedule.date.getUTCMonth() + 1;

	const { startDate, endDate } = getMonthDateRange(year, month);

	await db.transaction(async (tx) => {
		await tx
			.delete(nurseSchedule)
			.where(
				and(
					sql`${nurseSchedule.date} >= ${startDate}`,
					sql`${nurseSchedule.date} <= ${endDate}`,
				),
			);

		await tx.insert(nurseSchedule).values(
			schedules.map((s) => {
				const y = s.date.getUTCFullYear();
				const m = s.date.getUTCMonth();
				const d = s.date.getUTCDate();
				return {
					id: `schedule_${y}${m + 1}${d}_${s.nurseId}`,
					nurseId: s.nurseId,
					shiftId: s.shiftId,
					date: createUTCDate(y, m + 1, d),
				};
			}),
		);
	});
}

export async function updateScheduleShift(id: string, shiftId: string | null) {
	return db
		.update(nurseSchedule)
		.set({ shiftId })
		.where(eq(nurseSchedule.id, id));
}

export async function findShiftCountsByMonth(year: number, month: number) {
	const { startDate, endDate } = getMonthDateRange(year, month);

	const results = await db
		.select({
			date: nurseSchedule.date,
			shiftId: shift.id,
		})
		.from(nurseSchedule)
		.innerJoin(shift, eq(shift.id, nurseSchedule.shiftId))
		.where(
			and(
				sql`${nurseSchedule.date} >= ${startDate}`,
				sql`${nurseSchedule.date} <= ${endDate}`,
			),
		);

	return results.map((r) => ({
		date: r.date,
		shiftId: r.shiftId,
	}));
}

// ─────────────── PREFERENCES (combined query) ───────────────

/** Get all nurse preferences with nurse info */
export async function findAllPreferredShiftsByNurse() {
	return db
		.select({
			nurse: {
				id: nurse.id,
				name: nurse.name,
			},
			shiftId: nurseShiftPreference.shiftId,
			weight: nurseShiftPreference.weight,
			active: nurseShiftPreference.active,
		})
		.from(nurseShiftPreference)
		.innerJoin(nurse, eq(nurse.id, nurseShiftPreference.nurseId))
		.orderBy(desc(nurseShiftPreference.active), asc(nurse.name));
}

/** Upsert preferences with validation - ensures total doesn't exceed daysInMonth */
export async function upsertNurseShiftPreferences(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
		active: boolean;
	}[],
	daysInMonth: number,
) {
	if (preferences.length === 0) return;

	// Group by nurseId to validate total
	const byNurse = new Map<string, typeof preferences>();
	for (const p of preferences) {
		const existing = byNurse.get(p.nurseId) ?? [];
		existing.push(p);
		byNurse.set(p.nurseId, existing);
	}

	// Check that total for each nurse doesn't exceed daysInMonth
	const validated: typeof preferences = [];
	for (const [nurseId, prefs] of byNurse) {
		const totalWeight = prefs.reduce((sum, p) => sum + p.weight, 0);
		if (totalWeight > 100) {
			// Clamp to 100 maximum
			for (const p of prefs) {
				validated.push({
					...p,
					weight: Math.min(p.weight, 100),
					active: p.active && totalWeight > 0,
				});
			}
		} else {
			validated.push(...prefs);
		}
	}

	await db
		.insert(nurseShiftPreference)
		.values(
			validated.map((pref) => ({
				nurseId: pref.nurseId,
				shiftId: pref.shiftId,
				weight: pref.weight,
				active: pref.active,
			})),
		)
		.onConflictDoUpdate({
			target: [nurseShiftPreference.nurseId, nurseShiftPreference.shiftId],
			set: {
				weight: sql`excluded.weight`,
				active: sql`excluded.active`,
			},
		});
}
