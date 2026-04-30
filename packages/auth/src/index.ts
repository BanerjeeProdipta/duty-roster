import { createDb } from "@Duty-Roster/db";
import * as schema from "@Duty-Roster/db/schema/auth";
import { expo } from "@better-auth/expo";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { env } from "./env";

/**
 * Fast password hashing for Cloudflare Workers Free Tier (10ms limit).
 * Uses native crypto.subtle for performance.
 */
const fastHasher = {
	hash: async (password: string) => {
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const encoder = new TextEncoder();
		const baseKey = await crypto.subtle.importKey(
			"raw",
			encoder.encode(password),
			"PBKDF2",
			false,
			["deriveBits"],
		);
		const hashBuffer = await crypto.subtle.deriveBits(
			{
				name: "PBKDF2",
				salt: salt,
				iterations: 1000, // Balanced for 10ms limit
				hash: "SHA-256",
			},
			baseKey,
			256,
		);

		const combined = new Uint8Array(16 + 32);
		combined.set(salt);
		combined.set(new Uint8Array(hashBuffer), 16);
		return btoa(String.fromCharCode(...combined));
	},
	verify: async ({ password, hash }: { password: string; hash: string }) => {
		try {
			const combined = new Uint8Array(
				atob(hash)
					.split("")
					.map((c) => c.charCodeAt(0)),
			);
			const salt = combined.slice(0, 16);
			const originalHash = combined.slice(16);

			const encoder = new TextEncoder();
			const baseKey = await crypto.subtle.importKey(
				"raw",
				encoder.encode(password),
				"PBKDF2",
				false,
				["deriveBits"],
			);
			const hashBuffer = await crypto.subtle.deriveBits(
				{
					name: "PBKDF2",
					salt: salt,
					iterations: 1000,
					hash: "SHA-256",
				},
				baseKey,
				256,
			);

			const currentHash = new Uint8Array(hashBuffer);
			if (currentHash.length !== originalHash.length) return false;
			return currentHash.every((b, i) => b === originalHash[i]);
		} catch (_e) {
			return false;
		}
	},
};

export function createAuth(options?: { baseURL?: string }) {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		trustedOrigins: [
			env.CORS_ORIGIN,
			"https://*.pages.dev",
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
			password: fastHasher,
		},
		user: {},
		secret: env.BETTER_AUTH_SECRET,
		baseURL: options?.baseURL || env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: env.NODE_ENV === "production" ? "none" : "lax",
				secure: env.NODE_ENV === "production",
				httpOnly: true,
			},
		},
		plugins: [admin(), expo(), nextCookies()],
	});
}

type AuthClient = ReturnType<typeof createAuth>;

let _auth: AuthClient | null = null;

export const auth = new Proxy({} as AuthClient, {
	get(_, prop) {
		if (!_auth) {
			_auth = createAuth();
		}
		return (_auth as any)[prop];
	},
});
