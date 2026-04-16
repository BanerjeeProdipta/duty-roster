import { db, schema } from "@Duty-Roster/db";
import { and, desc, sql } from "drizzle-orm";

const { nurse, nurseSchedule, shift } = schema;

export async function findAllNurses() {
	return db.select().from(nurse).orderBy(desc(nurse.createdAt));
}

export async function findAllShifts() {
	return db.select().from(shift);
}

export async function createSchedules(
	schedules: {
		nurseId: string;
		shiftId: string | null;
		date: Date;
	}[],
) {
	if (!schedules.length) return;

	const year = schedules[0].date.getFullYear();
	const month = schedules[0].date.getMonth() + 1;

	const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
	const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));

	await db
		.delete(nurseSchedule)
		.where(
			and(
				sql`${nurseSchedule.date} >= ${startDate.toISOString()}`,
				sql`${nurseSchedule.date} <= ${endDate.toISOString()}`,
			),
		);

	try {
		await db.insert(nurseSchedule).values(
			schedules.map((s, i) => ({
				id: `schedule_${Date.now()}_${i}`,
				nurseId: s.nurseId,
				shiftId: s.shiftId,
				date: new Date(
					Date.UTC(
						s.date.getFullYear(),
						s.date.getMonth(),
						s.date.getDate(),
						12,
						0,
						0,
					),
				),
			})),
		);
	} catch (e: any) {
		console.error("DB Error:", e);
		throw e;
	}
}
