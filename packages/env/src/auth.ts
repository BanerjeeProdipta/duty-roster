// import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const config = {
	server: {
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
		CORS_ORIGIN: z.string().url().default("http://localhost:3000"),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	emptyStringAsUndefined: true,
};

const getRuntimeEnv = () =>
	new Proxy((typeof process !== "undefined" ? process.env : {}) as any, {
		get(target, prop) {
			return (globalThis as any)._CF_ENV?.[prop as string] ?? target[prop];
		},
	});

export const env = new Proxy({} as any, {
	get(_, prop) {
		const validatedEnv = createEnv({
			...config,
			runtimeEnv: getRuntimeEnv(),
		});
		return (validatedEnv as any)[prop];
	},
});
