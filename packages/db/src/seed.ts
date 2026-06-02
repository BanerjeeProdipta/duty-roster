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
	} catch (_error) {
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

interface NurseSeed {
	id: string;
	name: string;
	active: boolean;
}

const nurseData: NurseSeed[] = [
	{ id: "nurse_1", name: "জয়শ্রী", active: true },
	{ id: "nurse_2", name: "মার্গারেট", active: true },
	{ id: "nurse_3", name: "মোর্শেদা", active: true },
	{ id: "nurse_4", name: "সুপ্রিয়া", active: true },
	{ id: "nurse_5", name: "জহোরা", active: true },
	{ id: "nurse_6", name: "গীতা", active: true },
	{ id: "nurse_7", name: "বিলকিস", active: true },
	{ id: "nurse_8", name: "নাসরিন", active: true },
	{ id: "nurse_9", name: "তাহেরা", active: true },
	{ id: "nurse_10", name: "সেলিনা", active: true },
	{ id: "nurse_11", name: "সালমা", active: true },
	{ id: "nurse_12", name: "তাসলিমা", active: true },
	{ id: "nurse_13", name: "খালেদা", active: true },
	{ id: "nurse_14", name: "তাহমিনা", active: true },
	{ id: "nurse_15", name: "ডলি", active: true },
	{ id: "nurse_16", name: "ইয়াসমিন", active: true },
	{ id: "nurse_17", name: "আন্না", active: true },
	{ id: "nurse_18", name: "মৌ", active: false },
	{ id: "nurse_19", name: "নাসরিন ২", active: false },
	{ id: "nurse_20", name: "সেলিনা ২", active: true },
	{ id: "nurse_21", name: "মমতাজ", active: true },
	{ id: "nurse_22", name: "শ্রাবণী", active: true },
	{ id: "nurse_23", name: "মৌসুমী", active: true },
	{ id: "nurse_24", name: "মনি", active: true },
	{ id: "nurse_25", name: "শিরিন", active: true },
	{ id: "nurse_26", name: "সাফিয়া", active: true },
	{ id: "nurse_27", name: "অঞ্জলি", active: true },
	{ id: "nurse_28", name: "মালেকা", active: true },
	{ id: "nurse_29", name: "সাদিয়া", active: true },
	{ id: "nurse_30", name: "সুবর্ণা", active: true },
	{ id: "nurse_31", name: "মাধুরী", active: true },
	{ id: "nurse_32", name: "হালিমা", active: true },
];

async function seed() {
	// -----------------------------
	// CLEANUP: remove existing nurse data (dummies will be replaced)
	// -----------------------------
	console.log("Clearing existing nurse data...");
	await db.delete(schema.nurseSchedule);
	await db.delete(schema.nurseShiftPreference);
	await db.delete(schema.nurse);
	console.log("Cleared nurse, preference, and schedule tables.");

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

	const nurses = nurseData.map((n) => ({
		id: n.id,
		name: n.name,
		active: n.active,
	}));

	await db.insert(schema.nurse).values(nurses).onConflictDoNothing();
	console.log("Seeded nurses:", nurses.length);

	// -----------------------------
	// SEED PREFERENCES (RELATIONAL)
	// -----------------------------
	console.log("Seeding nurse shift preferences...");

	const preferenceWeights: Record<string, Record<string, number>> = {
		nurse_1: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_2: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_3: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_4: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_5: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_6: { shift_morning: 68, shift_evening: 13, shift_night: 0 },
		nurse_7: { shift_morning: 71, shift_evening: 0, shift_night: 6 },
		nurse_8: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_9: { shift_morning: 55, shift_evening: 13, shift_night: 10 },
		nurse_10: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_11: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_12: { shift_morning: 55, shift_evening: 13, shift_night: 10 },
		nurse_13: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_14: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_15: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_16: { shift_morning: 55, shift_evening: 13, shift_night: 10 },
		nurse_17: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_18: { shift_morning: 65, shift_evening: 10, shift_night: 6 },
		nurse_19: { shift_morning: 65, shift_evening: 10, shift_night: 6 },
		nurse_20: { shift_morning: 0, shift_evening: 68, shift_night: 10 },
		nurse_21: { shift_morning: 55, shift_evening: 13, shift_night: 10 },
		nurse_22: { shift_morning: 55, shift_evening: 13, shift_night: 10 },
		nurse_23: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_24: { shift_morning: 61, shift_evening: 6, shift_night: 10 },
		nurse_25: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_26: { shift_morning: 0, shift_evening: 68, shift_night: 10 },
		nurse_27: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_28: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
		nurse_29: { shift_morning: 55, shift_evening: 13, shift_night: 10 },
		nurse_30: { shift_morning: 68, shift_evening: 0, shift_night: 10 },
		nurse_31: { shift_morning: 0, shift_evening: 68, shift_night: 10 },
		nurse_32: { shift_morning: 81, shift_evening: 0, shift_night: 0 },
	};

	const preferences: {
		nurseId: string;
		shiftId: string;
		weight: number;
	}[] = [];

	for (const nurse of nurses) {
		const weights = preferenceWeights[nurse.id]!;
		preferences.push(
			{
				nurseId: nurse.id,
				shiftId: "shift_morning",
				weight: weights.shift_morning as number,
			},
			{
				nurseId: nurse.id,
				shiftId: "shift_evening",
				weight: weights.shift_evening as number,
			},
			{
				nurseId: nurse.id,
				shiftId: "shift_night",
				weight: weights.shift_night as number,
			},
		);
	}

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
