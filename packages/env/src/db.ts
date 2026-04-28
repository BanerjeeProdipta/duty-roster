import { initDbEnv } from "./loader";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

initDbEnv();

const config = {
	server: {
		DATABASE_URL: z.string().min(1),
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
