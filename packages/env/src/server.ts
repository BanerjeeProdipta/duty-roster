// import "dotenv/config";
import { env as authEnv } from "./auth";
import { env as dbEnv } from "./db";

export const env = {
	...dbEnv,
	...authEnv,
};
