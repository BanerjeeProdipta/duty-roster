import fs from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { Pool } from "pg";

// Load the workspace root apps/server .env so we read production DATABASE_URL
const __dirname = dirname(fileURLToPath(import.meta.url));
// from packages/db/src -> workspace root is ../../../
dotenv.config({
	path: `${__dirname}/../../../apps/server/.env`,
	override: false,
});

let raw = process.env.DATABASE_URL;
if (!raw) {
	// fallback to root .env
	dotenv.config({ path: `${__dirname}/../../../.env`, override: false });
	raw = process.env.DATABASE_URL;
}
if (!raw) {
	console.error("DATABASE_URL not found in apps/server/.env or root .env");
	process.exit(1);
}

// Remove unsupported query params for pg client
const clean = raw
	.replace(/uselibpqcompat=[^&]*&?/g, "")
	.replace(/&$/g, "")
	.replace(/\?$/g, "");

const pool = new Pool({ connectionString: clean });

const tables = [
	"shift",
	"nurse",
	"user",
	"account",
	"session",
	"verification",
	"nurseShiftPreference",
	"nurseSchedule",
];

function toSnake(name: string) {
	return name
		.replace(/([a-z0-9])([A-Z])/g, "$1_$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
		.toLowerCase();
}

async function exportTables() {
	const out: Record<string, unknown[]> = {};
	try {
		for (const t of tables) {
			console.log(`Querying ${t}...`);
			let rows = [];
			const candidates = [t, toSnake(t)];
			let usedName: string | null = null;
			for (const c of candidates) {
				try {
					const res = await pool.query(`SELECT * FROM ${c}`);
					rows = res.rows;
					usedName = c;
					break;
				} catch (err) {
					// try next candidate
				}
			}
			if (!usedName) {
				console.warn(
					`Skipping ${t}: no matching table found (tried: ${candidates.join(",")})`,
				);
				continue;
			}
			out[t] = rows;
			console.log(`Fetched ${rows.length} rows from ${usedName}`);
		}

		const target = `${__dirname}/prods.json`;
		await fs.writeFile(target, JSON.stringify(out, null, 2), "utf8");
		console.log(`Wrote production dump to ${target}`);
	} catch (err) {
		console.error("Export failed:", err);
		process.exit(1);
	} finally {
		await pool.end();
	}
}

exportTables();
