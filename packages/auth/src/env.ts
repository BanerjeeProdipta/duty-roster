// import "dotenv/config";
import { z } from "zod";

const authEnvSchema = z.object({
	BETTER_AUTH_SECRET: z
		.string()
		.min(1)
		.optional()
		.default("a-very-secret-key-that-is-at-least-32-characters-long"),
	BETTER_AUTH_URL: z.string().optional().default("http://localhost:3000"),
	CORS_ORIGIN: z.string().optional().default("http://localhost:3000"),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

const getRuntimeEnv = () =>
	new Proxy((typeof process !== "undefined" ? process.env : {}) as any, {
		get(target, prop) {
			return (globalThis as any)._CF_ENV?.[prop as string] ?? target[prop];
		},
	});

export const env = new Proxy({} as z.infer<typeof authEnvSchema>, {
	get(_, prop) {
		const validated = authEnvSchema.parse(getRuntimeEnv());
		return (validated as any)[prop];
	},
});
