import dotenv from "dotenv";

dotenv.config({
	path: "../../apps/server/.env",
});

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const dbUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL or DATABASE_URL_DIRECT must be set");
const sql = neon(dbUrl);
const db = drizzle(sql, { schema });

const nurseNames = [
	"জয়শ্রী",
	"মার্গারেট",
	"মোর্শেদা",
	"সুপ্রিয়া",
	"জহোরা",
	"গীতা",
	"বিলকিস",
	"নাসরিন",
	"সুপ্রিয়া",
	"সেলিনা",
	"সালমা",
	"তাসলিমা",
	"খালেদা",
	"তাহমিনা",
	"ডলি",
	"ইয়াসমিন",
	"আনা",
	"মৌ",
	"নাসরিন ২",
	"সেলিনা ২",
	"মমতাজ",
	"শ্রাবণী",
	"মৌসুমী",
	"মনি",
	"শিরিন",
	"সাফিয়া",
	"অঞ্জলি",
	"ডামি ১",
	"ডামি ২",
	"ডামি ৩",
	"ডামি ৪",
	"ডামি ৫",
];

async function seed() {
	// -----------------------------
	// SEED SHIFTS
	// -----------------------------
	console.log("Seeding shifts...");

	const shifts = [
		{
			id: "shift_morning",
			name: "morning" as const,
			startTime: "08:00",
			endTime: "14:00",
			crossesMidnight: false,
		},
		{
			id: "shift_evening",
			name: "evening" as const,
			startTime: "14:00",
			endTime: "20:00",
			crossesMidnight: false,
		},
		{
			id: "shift_night",
			name: "night" as const,
			startTime: "20:00",
			endTime: "08:00",
			crossesMidnight: true,
		},
	];

	await db.insert(schema.shift).values(shifts).onConflictDoNothing();
	console.log("Seeded shifts:", shifts.length);

	// -----------------------------
	// SEED NURSES
	// -----------------------------
	console.log("Seeding nurses...");

	const nurses = nurseNames.map((name, i) => ({
		id: `nurse_${i + 1}`,
		name,
	}));

	await db.insert(schema.nurse).values(nurses).onConflictDoNothing();
	console.log("Seeded nurses:", nurses.length);

	// -----------------------------
	// SEED PREFERENCES (RELATIONAL)
	// -----------------------------
	console.log("Seeding nurse shift preferences...");

	function generateShiftProportions() {
		return {
			morning: 55,
			evening: 20,
			night: 10,
		};
	}

	const preferences = nurses.flatMap((nurse) => {
		const proportions = generateShiftProportions();

		return [
			{
				nurseId: nurse.id,
				shiftId: "shift_morning",
				weight: proportions.morning,
			},
			{
				nurseId: nurse.id,
				shiftId: "shift_evening",
				weight: proportions.evening,
			},
			{
				nurseId: nurse.id,
				shiftId: "shift_night",
				weight: proportions.night,
			},
		];
	});

	await db
		.insert(schema.nurseShiftPreference)
		.values(preferences)
		.onConflictDoNothing();

	console.log("Seeded preferences:", preferences.length);
}

seed();
