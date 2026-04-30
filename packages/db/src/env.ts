// import "dotenv/config";
import { initDbEnv } from "@Duty-Roster/env/loader";
import { z } from "zod";

initDbEnv();

const dbEnvSchema = z.object({
	DATABASE_URL: z.string().min(1),
});

export function getDbEnv() {
	if (typeof window !== "undefined") {
		throw new Error("DATABASE_URL is not available in browser environment");
	}
	const runtimeEnv = {
		...((typeof process !== "undefined" ? process.env : {}) as Record<
			string,
			string
		>),
		...(typeof globalThis !== "undefined" && (globalThis as any)._CF_ENV
			? (globalThis as any)._CF_ENV
			: {}),
	};
	return dbEnvSchema.parse(runtimeEnv);
}
