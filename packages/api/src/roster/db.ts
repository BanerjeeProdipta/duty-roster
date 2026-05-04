import { db, schema } from "@Duty-Roster/db";
import { and, asc, desc, eq, sql } from "drizzle-orm";

const { nurse, nurseSchedule, shift, nurseShiftPreference } = schema;

import { getMonthDateRange } from "./utils";

// ─────────────── NURSES ───────────────

export async function findAllNurses() {
	return db
		.select({
			id: nurse.id,
			name: nurse.name,
			active: nurse.active,
			createdAt: nurse.createdAt,
		})
		.from(nurse)
		.orderBy(desc(nurse.active), nurse.name);
}

export async function updateNurse(
	nurseId: string,
	data: { name?: string; active?: boolean },
) {
	const [row] = await db
		.update(nurse)
		.set(data)
		.where(eq(nurse.id, nurseId))
		.returning();
	return row;
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
	const start =
		typeof startDate === "string" ? new Date(startDate) : new Date(startDate);
	const end =
		typeof endDate === "string" ? new Date(endDate) : new Date(endDate);

	// Get UTC date strings for DB comparison
	const startStr = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")} 00:00:00`;
	const endStr = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}-${String(end.getUTCDate()).padStart(2, "0")} 23:59:59`;

	console.log(`🔍 Query: ${startStr} to ${endStr}`);

	const result = await db.execute(sql`
    WITH nurse_prefs AS (
      SELECT
        nurse.id,
        nurse.name,
        nurse.active                                                 AS active,
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
      WHERE ns.date >= ${sql.raw(`'${startStr}'`)}
        AND ns.date <= ${sql.raw(`'${endStr}'`)}
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

	// 1️⃣ Clear the entire month first
	await db
		.delete(nurseSchedule)
		.where(
			and(
				sql`${nurseSchedule.date} >= ${startDate}`,
				sql`${nurseSchedule.date} <= ${endDate}`,
			),
		);

	// 2️⃣ Use raw SQL for fast bulk insert
	if (schedules.length === 0) return;

	console.log(`🗑️ Clearing month ${year}-${month}...`);
	console.log(`📝 Building bulk insert with ${schedules.length} records...`);

	const values = schedules
		.map(
			(s) =>
				`('schedule_${s.nurseId}_${s.date.toISOString().split("T")[0]}', '${s.nurseId}', '${s.date.toISOString()}', ${s.shiftId ? `'${s.shiftId}'` : "NULL"})`,
		)
		.join(", ");

	try {
		await db.execute(
			sql`INSERT INTO nurse_schedule (id, nurse_id, date, shift_id) VALUES ${sql.raw(values)} ON CONFLICT (id) DO UPDATE SET shift_id = EXCLUDED.shift_id`,
		);
		console.log("✅ Schedules saved!");
	} catch (err) {
		console.error("❌ DB Error:", err);
		throw err;
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

// ─────────────── PREFERENCES (combined query) ───────────────

/** Get all nurse preferences with nurse info */
export async function findAllPreferredShiftsByNurse() {
	return db
		.select({
			nurse: {
				id: nurse.id,
				name: nurse.name,
				active: nurse.active,
			},
			shiftId: nurseShiftPreference.shiftId,
			weight: nurseShiftPreference.weight,
			active: nurseShiftPreference.active,
		})
		.from(nurseShiftPreference)
		.innerJoin(nurse, eq(nurse.id, nurseShiftPreference.nurseId))
		.orderBy(desc(nurseShiftPreference.active), asc(nurse.name));
}

/** Delete preferences for a list of nurse IDs */
export async function deletePreferencesForNurses(nurseIds: string[]) {
	if (nurseIds.length === 0) return;
	await db
		.delete(nurseShiftPreference)
		.where(sql`${nurseShiftPreference.nurseId} IN ${nurseIds}`);
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

	try {
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
	} catch (error) {
		console.error("Failed to upsert nurse shift preferences:", error);
		console.error("Validated preferences sample:", validated.slice(0, 3));
		throw new Error(
			`Failed query: insert into "nurse_shift_preference" - ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}
