import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getTableColumns, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { PgTable } from "drizzle-orm/pg-core";
import { Pool } from "pg";
import * as schema from "./schema";

// Usage:
//   bun run src/migrate-local-to-prod.ts                 # dry run (default) - prints row counts only
//   bun run src/migrate-local-to-prod.ts --yes            # actually copies rows local -> prod
//   bun run src/migrate-local-to-prod.ts --yes --tables=nurse,shift
//
// Source (local) URL resolution: LOCAL_DATABASE_URL env, else DATABASE_URL from
// apps/server/.env.development.local.
// Target (prod) URL resolution: PROD_DATABASE_URL env, else DATABASE_URL from
// apps/server/.env, else the workspace root .env.

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../../..");

function loadUrlFromEnvFile(path: string): string | undefined {
	const parsed = dotenv.config({ path, override: false }).parsed;
	return parsed?.DATABASE_URL;
}

const args = process.argv.slice(2);
const isLive = args.includes("--yes");
const tablesArg = args
	.find((a) => a.startsWith("--tables="))
	?.slice("--tables=".length);
const onlyTables = tablesArg
	? new Set(tablesArg.split(",").map((t) => t.trim()))
	: null;

const localUrl =
	process.env.LOCAL_DATABASE_URL ||
	loadUrlFromEnvFile(resolve(rootDir, "apps/server/.env.development.local"));

const prodUrl =
	process.env.PROD_DATABASE_URL ||
	loadUrlFromEnvFile(resolve(rootDir, "apps/server/.env")) ||
	loadUrlFromEnvFile(resolve(rootDir, ".env"));

if (!localUrl) {
	console.error(
		"Could not resolve the local DB URL. Set LOCAL_DATABASE_URL or ensure apps/server/.env.development.local has DATABASE_URL.",
	);
	process.exit(1);
}
if (!prodUrl) {
	console.error(
		"Could not resolve the prod DB URL. Set PROD_DATABASE_URL or ensure apps/server/.env has DATABASE_URL.",
	);
	process.exit(1);
}
if (localUrl === prodUrl) {
	console.error(
		"Local and prod DATABASE_URL resolved to the same value - refusing to run.",
	);
	process.exit(1);
}

const localPool = new Pool({ connectionString: localUrl });
const prodPool = new Pool({ connectionString: prodUrl });
const localDb = drizzlePg(localPool, { schema });
const prodDb = drizzlePg(prodPool, { schema });

// conflictKeys are the JS property names (as used on the drizzle table object),
// not the underlying SQL column names.
function buildConflictUpdateSet(table: PgTable, conflictKeys: string[]) {
	const columns = getTableColumns(table);
	const set: Record<string, ReturnType<typeof sql.raw>> = {};
	for (const [key, column] of Object.entries(columns)) {
		if (conflictKeys.includes(key)) continue;
		set[key] = sql.raw(`excluded.${column.name}`);
	}
	return set;
}

// Dependency order: parents before children (FK-safe for insert/upsert).
const MIGRATION_PLAN: {
	name: string;
	table: PgTable;
	conflictKeys: [string, ...string[]];
}[] = [
	{ name: "shift", table: schema.shift, conflictKeys: ["id"] },
	{ name: "user", table: schema.user, conflictKeys: ["id"] },
	{ name: "nurse", table: schema.nurse, conflictKeys: ["id"] },
	{ name: "account", table: schema.account, conflictKeys: ["id"] },
	{ name: "session", table: schema.session, conflictKeys: ["id"] },
	{ name: "verification", table: schema.verification, conflictKeys: ["id"] },
	{
		name: "nurseShiftPreference",
		table: schema.nurseShiftPreference,
		conflictKeys: ["nurseId", "shiftId"],
	},
	{ name: "nurseSchedule", table: schema.nurseSchedule, conflictKeys: ["id"] },
	{ name: "agentDocument", table: schema.agentDocument, conflictKeys: ["id"] },
];

const CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size)
		out.push(items.slice(i, i + size));
	return out;
}

async function migrateTable(plan: (typeof MIGRATION_PLAN)[number]) {
	const rows = await localDb.select().from(plan.table as never);
	if (rows.length === 0) {
		console.log(`  ${plan.name}: 0 rows in local, skipping`);
		return;
	}

	if (!isLive) {
		console.log(
			`  ${plan.name}: ${rows.length} rows would be upserted (dry run)`,
		);
		return;
	}

	const set = buildConflictUpdateSet(plan.table, plan.conflictKeys);
	const columns = getTableColumns(plan.table);
	const target = plan.conflictKeys.map((k) => columns[k]);
	let copied = 0;
	for (const batch of chunk(rows, CHUNK_SIZE)) {
		await prodDb
			.insert(plan.table as never)
			.values(batch as never)
			.onConflictDoUpdate({ target: target as never, set });
		copied += batch.length;
	}
	console.log(`  ${plan.name}: upserted ${copied} rows into prod`);
}

async function main() {
	console.log(`Mode: ${isLive ? "LIVE (writing to prod)" : "DRY RUN"}`);
	console.log(`Local source:  ${localUrl?.replace(/:[^:@]*@/, ":***@")}`);
	console.log(`Prod target:   ${prodUrl?.replace(/:[^:@]*@/, ":***@")}`);
	console.log();

	if (isLive) {
		console.log("Writing to production in 5s - press Ctrl+C to abort...");
		await new Promise((r) => setTimeout(r, 5000));
	}

	for (const plan of MIGRATION_PLAN) {
		if (onlyTables && !onlyTables.has(plan.name)) continue;
		await migrateTable(plan);
	}

	console.log("\nDone.");
}

main()
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await localPool.end();
		await prodPool.end();
	});
