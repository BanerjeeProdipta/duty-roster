import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDbEnv } from "./env";
import * as schema from "./schema";

export function createDb() {
	const env = getDbEnv();
	const runtimeEnv = {
		...(typeof process !== "undefined" ? process.env : {}),
		...(typeof globalThis !== "undefined" && (globalThis as any)._CF_ENV
			? (globalThis as any)._CF_ENV
			: {}),
	};
	const isProduction = runtimeEnv.NODE_ENV === "production";
	const url =
		runtimeEnv.DATABASE_URL_DIRECT ||
		runtimeEnv.DATABASE_URL ||
		env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL or DATABASE_URL_DIRECT must be set");

	if (
		isProduction ||
		(typeof process !== "undefined" &&
			(process as any).release?.name !== "node")
	) {
		// Neon HTTP driver requires the direct connection URL, not the pooled one.
		const directUrl = url.includes("-pooler")
			? url.replace(/-pooler(-[\w]+)?\./, ".")
			: url;
		const sql = neon(directUrl);
		return drizzleNeon(sql, { schema });
	}

	const pool = new Pool({ connectionString: url });
	return drizzlePg(pool, { schema });
}

type DbClient = ReturnType<typeof createDb>;

let _db: DbClient | null = null;

export const db = new Proxy({} as DbClient, {
	get(_, prop) {
		if (!_db) {
			_db = createDb();
		}
		return _db[prop as keyof DbClient];
	},
});

export { schema };
