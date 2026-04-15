import { createDb } from "@Duty-Roster/db";
import * as schema from "@Duty-Roster/db/schema/auth";
import { env } from "@Duty-Roster/env/server";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { adminClient } from "better-auth/client/plugins";

export type UserRole = "admin" | "user";

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [
			env.CORS_ORIGIN,
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
		user: {
			additionalFields: {
				role: {
					type: "string",
					defaultValue: "user",
					required: false,
					input: false,
					returned: true,
				},
			},
		},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
		},
		plugins: [expo(), adminClient()],
	});
}

export const auth = createAuth();
