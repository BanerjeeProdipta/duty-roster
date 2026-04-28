import { initServerEnv } from "./loader";
import { env as authEnv } from "./auth";
import { env as dbEnv } from "./db";

initServerEnv();

export const env = {
	...dbEnv,
	...authEnv,
};
