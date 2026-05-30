import { env as authEnv } from "./auth";
import { env as dbEnv } from "./db";
import { initServerEnv } from "./loader";

await initServerEnv();

export const env = {
	...dbEnv,
	...authEnv,
};
