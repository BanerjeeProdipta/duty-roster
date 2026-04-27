// import "dotenv/config";
import { z } from "zod";

const dbEnvSchema = z.object({
	DATABASE_URL: z.string().min(1),
});

const getRuntimeEnv = () =>
	new Proxy((typeof process !== "undefined" ? process.env : {}) as any, {
		get(target, prop) {
			return (globalThis as any)._CF_ENV?.[prop as string] ?? target[prop];
		},
	});

export const env = new Proxy({} as z.infer<typeof dbEnvSchema>, {
	get(_, prop) {
		const validated = dbEnvSchema.parse(getRuntimeEnv());
		return (validated as any)[prop];
	},
});
