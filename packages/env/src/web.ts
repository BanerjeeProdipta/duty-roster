import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { initWebEnv } from "./loader";

initWebEnv();

const DEFAULT_SERVER_URL = "https://duty-roster-server.duty-roster.workers.dev";

export const env = createEnv({
	client: {
		NEXT_PUBLIC_SERVER_URL: z.string().url().default(DEFAULT_SERVER_URL),
	},
	runtimeEnv: {
		NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL,
	},
	emptyStringAsUndefined: true,
});
