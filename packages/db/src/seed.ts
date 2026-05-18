import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDbEnv } from "./env";
import * as schema from "./schema";

const env = getDbEnv();
const dbUrl = process.env.DATABASE_URL_DIRECT || env.DATABASE_URL;
if (!dbUrl) throw new Error("DATABASE_URL or DATABASE_URL_DIRECT must be set");

const useProductionDb = process.env.NODE_ENV === "production";
const useProdsSeed = process.argv.includes("--prods");

const db = useProductionDb
	? drizzleNeon(neon(dbUrl), { schema })
	: drizzlePg(new Pool({ connectionString: dbUrl }), { schema });

const prodsSeedPath =
	process.env.PRODS_SEED_PATH || env.PRODS_SEED_PATH || "./prods.json";

async function seedProds() {
	console.log("Seeding from prods dump:", prodsSeedPath);
	const fs = await import("node:fs/promises");
	const path = await import("node:path");
	const { fileURLToPath } = await import("node:url");
	const sourceDir = path.dirname(fileURLToPath(import.meta.url));
	const resolvedPath = path.resolve(sourceDir, prodsSeedPath);

	let contents: string;
	try {
		contents = await fs.readFile(resolvedPath, "utf8");
	} catch (error) {
		throw new Error(
			`Unable to read prods seed file at ${resolvedPath}. Set PRODS_SEED_PATH or create the file.`,
		);
	}

	const dump = JSON.parse(contents) as Record<string, unknown[]>;
	const seedOrder = [
		"shift",
		"nurse",
		"user",
		"account",
		"session",
		"verification",
		"nurseShiftPreference",
		"nurseSchedule",
	];

	function parseDateString(value: unknown): unknown {
		if (typeof value !== "string") return value;
		// Accept both 'T' and space separated timestamps (with optional fraction and timezone)
		if (!/^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(value)) return value;
		const date = new Date(value);
		return Number.isNaN(date.getTime()) ? value : date;
	}

	function normalizeRowValues(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map(normalizeRowValues);
		}
		if (value && typeof value === "object") {
			return Object.fromEntries(
				Object.entries(value).map(([key, val]) => [
					key,
					normalizeRowValues(val),
				]),
			);
		}
		return parseDateString(value);
	}

	function toCamel(s: string) {
		return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
	}

	function normalizeRowKeys(value: unknown): unknown {
		if (Array.isArray(value)) return value.map(normalizeRowKeys);
		if (value instanceof Date) return value;
		if (value && typeof value === "object") {
			return Object.fromEntries(
				Object.entries(value).map(([k, v]) => [
					toCamel(k),
					normalizeRowKeys(v),
				]),
			);
		}
		return value;
	}

	for (const tableName of seedOrder) {
		const rows = dump[tableName];
		if (!Array.isArray(rows) || rows.length === 0) continue;
		const table = (schema as any)[tableName];
		if (!table) {
			console.warn(`Skipping unknown table from prods dump: ${tableName}`);
			continue;
		}
		const normalizedRows = rows
			.map((row) => normalizeRowValues(row) as Record<string, unknown>)
			.map((r) => normalizeRowKeys(r) as Record<string, unknown>);
		const rowsWithId = normalizedRows.filter(
			(r) => r && (r as any).id !== undefined && (r as any).id !== null,
		);
		if (rowsWithId.length === 0) {
			console.warn(
				`No insertable rows found for ${tableName} (missing 'id' field). Skipping.`,
			);
			continue;
		}
		console.log(`Seeding ${rowsWithId.length} rows into ${tableName}...`);
		await db.insert(table).values(rowsWithId).onConflictDoNothing();
	}
}

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

async function run() {
	if (useProdsSeed) {
		await seedProds();
		return;
	}

	await seed();
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
