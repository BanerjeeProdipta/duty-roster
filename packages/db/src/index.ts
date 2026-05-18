import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDbEnv } from "./env";
import * as schema from "./schema";

const isProduction = process.env.NODE_ENV === "production";

export function createDb() {
	const env = getDbEnv();
	const url = process.env.DATABASE_URL_DIRECT || env.DATABASE_URL;
	if (!url) throw new Error("DATABASE_URL or DATABASE_URL_DIRECT must be set");

	if (isProduction) {
		const sql = neon(url);
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
