import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

if (!process.env.DATABASE_URL) {
	throw new Error(
		"DATABASE_URL is missing. Expected it in apps/server/.env for db seeding.",
	);
}

const sql = neon(process.env.DATABASE_URL!);

type ShiftType = "morning" | "evening" | "night";

const SHIFTS: Array<{
	id: string;
	name: ShiftType;
	startTime: string;
	endTime: string;
}> = [
	{
		id: "shift_morning",
		name: "morning",
		startTime: "08:00",
		endTime: "14:00",
	},
	{
		id: "shift_evening",
		name: "evening",
		startTime: "14:00",
		endTime: "20:00",
	},
	{ id: "shift_night", name: "night", startTime: "20:00", endTime: "08:00" },
];

const SHIFT_ID_BY_NAME: Record<ShiftType, string> = {
	morning: "shift_morning",
	evening: "shift_evening",
	night: "shift_night",
};

const firstNames = [
	"James",
	"Mary",
	"John",
	"Patricia",
	"Robert",
	"Jennifer",
	"Michael",
	"Linda",
	"William",
	"Elizabeth",
	"David",
	"Barbara",
	"Richard",
	"Susan",
	"Joseph",
	"Jessica",
	"Thomas",
	"Sarah",
	"Charles",
	"Karen",
	"Christopher",
	"Nancy",
	"Daniel",
	"Lisa",
	"Matthew",
	"Betty",
	"Anthony",
	"Margaret",
	"Mark",
	"Sandra",
	"Donald",
	"Ashley",
];

const lastNames = [
	"Smith",
	"Johnson",
	"Williams",
	"Brown",
	"Jones",
	"Garcia",
	"Miller",
	"Davis",
	"Rodriguez",
	"Martinez",
	"Hernandez",
	"Lopez",
	"Gonzalez",
	"Wilson",
	"Anderson",
	"Thomas",
	"Taylor",
	"Moore",
	"Jackson",
	"Martin",
	"Lee",
	"Perez",
	"Thompson",
	"White",
	"Harris",
	"Sanchez",
	"Clark",
	"Ramirez",
	"Lewis",
	"Robinson",
	"Walker",
	"Young",
];

async function seed() {
	console.log("Seeding shifts...");
	for (const s of SHIFTS) {
		await sql`
			INSERT INTO "shift" (id, name, start_time, end_time)
			VALUES (${s.id}, ${s.name}, ${s.startTime}, ${s.endTime})
			ON CONFLICT (id) DO UPDATE SET
				name = EXCLUDED.name,
				start_time = EXCLUDED.start_time,
				end_time = EXCLUDED.end_time
		`;
	}
	console.log("Seeded shifts");

	console.log("Seeding users...");

	const users = [];
	for (let i = 0; i < 32; i++) {
		const firstName = firstNames[i]!;
		const lastName = lastNames[i]!;
		const name = `${firstName} ${lastName}`;
		const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 1}@example.com`;
		const id = `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

		const preferredShiftId =
			i % 3 === 0
				? SHIFT_ID_BY_NAME.morning
				: i % 3 === 1
					? SHIFT_ID_BY_NAME.evening
					: SHIFT_ID_BY_NAME.morning;

		users.push({
			id,
			name,
			email,
			emailVerified: false,
			role: "user" as const,
			preferredShiftId,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	}

	const persistedUsers: Array<{
		id: string;
		preferredShiftId: string;
	}> = [];

	for (const u of users) {
		const result = (await sql`
			INSERT INTO "user" (
				id,
				name,
				email,
				email_verified,
				role,
				preferred_shift_id,
				created_at,
				updated_at
			)
			VALUES (
				${u.id},
				${u.name},
				${u.email},
				${u.emailVerified},
				${u.role},
				${u.preferredShiftId},
				${u.createdAt},
				${u.updatedAt}
			)
			ON CONFLICT (email) DO UPDATE SET
				name = EXCLUDED.name,
				role = EXCLUDED.role,
				preferred_shift_id = EXCLUDED.preferred_shift_id,
				updated_at = EXCLUDED.updated_at
			RETURNING id, preferred_shift_id
		`) as Array<{
			id: string;
			preferred_shift_id: string;
		}>;

		const insertedUser = result[0];
		if (!insertedUser) {
			throw new Error(`Failed to upsert user for email ${u.email}`);
		}

		persistedUsers.push({
			id: insertedUser.id,
			preferredShiftId: insertedUser.preferred_shift_id,
		});
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const numberOfDaysToPrefill = 14;

	console.log(`Prefilling schedules for ${numberOfDaysToPrefill} days...`);
	const shiftIds = [
		SHIFT_ID_BY_NAME.morning,
		SHIFT_ID_BY_NAME.evening,
		SHIFT_ID_BY_NAME.night,
	];
	for (const [userIndex, u] of persistedUsers.entries()) {
		for (let dayOffset = 0; dayOffset < numberOfDaysToPrefill; dayOffset++) {
			const date = new Date(today);
			date.setDate(today.getDate() + dayOffset);

			const shiftId = shiftIds[(userIndex + dayOffset) % shiftIds.length]!;

			await sql`
				INSERT INTO "user_schedule" (id, user_id, date, shift_id, created_at)
				VALUES (
					${`sched_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`},
					${u.id},
					${date},
					${shiftId},
					${new Date()}
				)
				ON CONFLICT (user_id, date) DO UPDATE SET shift_id = EXCLUDED.shift_id
			`;
		}
	}

	console.log(`Seeded ${users.length} users and prefilled schedules`);
}

seed().catch(console.error);
