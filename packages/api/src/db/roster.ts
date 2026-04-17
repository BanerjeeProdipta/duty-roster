import { db, schema } from "@Duty-Roster/db";
import { and, desc, sql } from "drizzle-orm";

const { nurse, nurseSchedule, shift, nurseShiftPreference } = schema;

export async function findAllNurses() {
	return db.select().from(nurse).orderBy(desc(nurse.createdAt));
}

export async function findAllShifts() {
	return db.select().from(shift);
}

export async function findSchedulesByDateRange(startDate: Date, endDate: Date) {
	// Extract date parts to avoid timezone issues
	const startYear = startDate.getFullYear();
	const startMonth = startDate.getMonth() + 1;
	const startDay = startDate.getDate();

	const endYear = endDate.getFullYear();
	const endMonth = endDate.getMonth() + 1;
	const endDay = endDate.getDate();

	// Use local date string for comparison (YYYY-MM-DD format)
	const startStr = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(startDay).padStart(2, "0")}`;
	const endStr = `${endYear}-${String(endMonth).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

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
		.from(nurseSchedule)
		.innerJoin(nurse, sql`${nurse.id} = ${nurseSchedule.nurseId}`)
		.leftJoin(shift, sql`${shift.id} = ${nurseSchedule.shiftId}`)
		.where(
			and(
				sql`to_char(${nurseSchedule.date}::date, 'YYYY-MM-DD') >= ${startStr}`,
				sql`to_char(${nurseSchedule.date}::date, 'YYYY-MM-DD') <= ${endStr}`,
			),
		)
		.orderBy(nurseSchedule.date);
}

export async function createSchedules(
	schedules: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[],
) {
	if (schedules.length === 0) return;

	const firstSchedule = schedules[0]!;
	const year = firstSchedule.date.getFullYear();
	const month = firstSchedule.date.getMonth() + 1;

	// Use date strings for deletion to avoid timezone issues
	const startStr = `${year}-${String(month).padStart(2, "0")}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const endStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

	await db
		.delete(nurseSchedule)
		.where(
			and(
				sql`to_char(${nurseSchedule.date}::date, 'YYYY-MM-DD') >= ${startStr}`,
				sql`to_char(${nurseSchedule.date}::date, 'YYYY-MM-DD') <= ${endStr}`,
			),
		);

	try {
		await db.insert(nurseSchedule).values(
			schedules.map((s, i) => {
				const y = s.date.getFullYear();
				const m = s.date.getMonth();
				const d = s.date.getDate();
				return {
					id: `schedule_${Date.now()}_${i}`,
					nurseId: s.nurseId,
					shiftId: s.shiftId,
					// Store as UTC noon to avoid timezone date shifting
					date: new Date(Date.UTC(y, m, d, 12, 0, 0, 0)),
				};
			}),
		);
	} catch (e: any) {
		console.error("DB Error:", e);
		throw e;
	}
}

export async function findAllPreferredShiftsByNurse() {
	return db
		.select({
			nurse: {
				id: nurse.id,
				name: nurse.name,
			},
			shiftId: nurseShiftPreference.shiftId,
			weight: nurseShiftPreference.weight,
		})
		.from(nurseShiftPreference)
		.innerJoin(nurse, sql`${nurse.id} = ${nurseShiftPreference.nurseId}`);
}

export async function upsertNurseShiftPreferences(
	preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
	}[],
) {
	for (const pref of preferences) {
		await db
			.insert(nurseShiftPreference)
			.values({
				nurseId: pref.nurseId,
				shiftId: pref.shiftId,
				weight: pref.weight,
			})
			.onConflictDoUpdate({
				target: [nurseShiftPreference.nurseId, nurseShiftPreference.shiftId],
				set: {
					weight: pref.weight,
				},
			});
	}
}
