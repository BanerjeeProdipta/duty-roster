import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDbEnv } from "./env";
import * as schema from "./schema";

export function createDb() {
	const env = getDbEnv();
	const sql = neon(env.DATABASE_URL);
	return drizzle(sql, { schema });
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
