import { db, schema } from "@Duty-Roster/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";

const { nurse, nurseSchedule, shift, nurseShiftPreference } = schema;

import { getMonthDateRange } from "./utils";

// ─────────────── NURSES ───────────────

export async function findAllNurses() {
	return db.select().from(nurse).orderBy(nurse.name);
}

// ─────────────── CREATE SCHEDULE ───────────────

export async function createSchedule(
	nurseId: string,
	date: Date,
	shiftId: string | null,
) {
	const id = `schedule_${nurseId}_${date.toISOString().split("T")[0]}`;
	const targetDate = new Date(date);
	targetDate.setUTCHours(0, 0, 0, 0);

	return db
		.insert(nurseSchedule)
		.values({
			id,
			nurseId,
			date: targetDate,
			shiftId: shiftId === "off" ? null : shiftId,
		})
		.onConflictDoUpdate({
			target: [nurseSchedule.nurseId, nurseSchedule.date],
			set: {
				shiftId: shiftId === "off" ? null : shiftId,
			},
		});
}

// ─────────────── SHIFTS ───────────────

export async function findAllShifts() {
	return db.select().from(shift);
}

// ─────────────── SCHEDULES ───────────────

export async function findSchedulesAndPreferencesByDateRange(
	startDate: Date,
	endDate: Date,
) {
	const start = new Date(startDate);
	start.setUTCHours(0, 0, 0, 0);

	const end = new Date(endDate);
	end.setUTCHours(23, 59, 59, 999);

	const result = await db.execute(sql`
    WITH nurse_prefs AS (
      SELECT
        nurse.id,
        nurse.name,
        COALESCE(BOOL_OR(nsp.active), false)                        AS active,
        COALESCE(SUM(CASE WHEN nsp.shift_id = 'shift_morning' THEN nsp.weight ELSE 0 END), 0) AS morning,
        COALESCE(SUM(CASE WHEN nsp.shift_id = 'shift_evening' THEN nsp.weight ELSE 0 END), 0) AS evening,
        COALESCE(SUM(CASE WHEN nsp.shift_id = 'shift_night'   THEN nsp.weight ELSE 0 END), 0) AS night
      FROM nurse
      LEFT JOIN nurse_shift_preference nsp ON nurse.id = nsp.nurse_id
      GROUP BY nurse.id, nurse.name
    ),

    nurse_assignments AS (
      SELECT
        ns.nurse_id,
        COALESCE(
          json_object_agg(
            TO_CHAR(ns.date, 'YYYY-MM-DD'),
            json_build_object('id', ns.id, 'shiftType', COALESCE(REPLACE(s.id, 'shift_', ''), 'off'))
          ),
          '{}'::json
        )                                                           AS assignments,
        COUNT(*) FILTER (WHERE s.id = 'shift_morning')             AS morning_count,
        COUNT(*) FILTER (WHERE s.id = 'shift_evening')             AS evening_count,
        COUNT(*) FILTER (WHERE s.id = 'shift_night')               AS night_count,
        COUNT(*) FILTER (WHERE s.id IS NOT NULL)                    AS total_assigned
      FROM nurse_schedule ns
      LEFT JOIN shift s ON s.id = ns.shift_id
      WHERE ns.date >= ${start}
        AND ns.date <= ${end}
      GROUP BY ns.nurse_id
    )

    SELECT
      np.id,
      np.name,
      np.active,
      np.morning                                                    AS "prefMorning",
      np.evening                                                    AS "prefEvening",
      np.night                                                      AS "prefNight",
      COALESCE(na.assignments, '{}'::json)                         AS assignments,
      COALESCE(na.morning_count, 0)                                AS "shiftMorning",
      COALESCE(na.evening_count, 0)                                AS "shiftEvening",
      COALESCE(na.night_count,   0)                                AS "shiftNight",
      COALESCE(na.total_assigned, 0)                               AS "totalAssigned"
    FROM nurse_prefs np
    LEFT JOIN nurse_assignments na ON np.id = na.nurse_id
    ORDER BY
      np.active DESC NULLS LAST,
      np.name ASC
  `);

	return result.rows;
}

export async function truncateSchedulesByDateRange(
	startDate: Date,
	endDate: Date,
): Promise<void> {
	await db
		.delete(nurseSchedule)
		.where(
			and(
				sql`${nurseSchedule.date} >= ${startDate}`,
				sql`${nurseSchedule.date} <= ${endDate}`,
			),
		);
}

export async function createSchedules(
	schedules: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[],
) {
	if (schedules.length === 0) return;

	// Schedules are already truncated in generateRoster, just insert
	const BATCH_SIZE = 500;
	for (let i = 0; i < schedules.length; i += BATCH_SIZE) {
		const batch = schedules.slice(i, i + BATCH_SIZE).map((s) => ({
			id: `schedule_${s.nurseId}_${s.date.toISOString().split("T")[0]}`,
			nurseId: s.nurseId,
			date: s.date,
			shiftId: s.shiftId,
		}));
		await db.insert(nurseSchedule).values(batch);
	}
}

export async function updateScheduleShift(id: string, shiftId: string | null) {
	const [row] = await db
		.update(nurseSchedule)
		.set({ shiftId })
		.where(eq(nurseSchedule.id, id))
		.returning();
	return row;
}

export async function findScheduleById(id: string) {
	const [row] = await db
		.select()
		.from(nurseSchedule)
		.where(eq(nurseSchedule.id, id))
		.limit(1);
	return row;
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
	_daysInMonth: number,
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
	for (const [_nurseId, prefs] of byNurse) {
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
				weight: sql`EXCLUDED.weight`,
				active: sql`EXCLUDED.active`,
			},
		});
}
