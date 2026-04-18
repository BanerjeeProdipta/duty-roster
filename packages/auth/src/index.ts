import { createDb } from "@Duty-Roster/db";
import * as schema from "@Duty-Roster/db/schema/auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { env } from "./env";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [
			env.CORS_ORIGIN,
			"http://localhost:3000",
			"http://localhost:3001",
			"Duty-Roster://",
			...(env.NODE_ENV === "development"
				? [
						"exp://",
						"exp://**",
						"exp://192.168.*.*:*/**",
						"http://localhost:8081",
					]
				: []),
		],
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 1,
		},
		user: {},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: env.NODE_ENV === "production" ? "none" : "lax",
				secure: env.NODE_ENV === "production",
				httpOnly: true,
			},
		},
		plugins: [expo()],
	});
}

export const auth = createAuth();
