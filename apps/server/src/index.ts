// Polyfill process for Cloudflare Workers
if (typeof process === "undefined") {
	(globalThis as any).process = { env: {} };
}

import { createContext } from "@Duty-Roster/api/context";
import { appRouter } from "@Duty-Roster/api/routers/index";
import { auth } from "@Duty-Roster/auth";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	CORS_ORIGIN: string;
	NODE_ENV?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger());

// Middleware to shim environment variables for packages that use process.env
app.use("*", async (c, next) => {
	(globalThis as any)._CF_ENV = c.env;
	// Also sync to process.env for extra compatibility
	if (globalThis.process) {
		globalThis.process.env = { ...globalThis.process.env, ...c.env };
	}
	await next();
});

app.use("/*", async (c, next) => {
	// Debug log to see if bindings are coming through
	console.log("CORS_ORIGIN Binding:", c.env.CORS_ORIGIN);

	const corsMiddleware = cors({
		origin: c.env.CORS_ORIGIN || "*", // Fallback to * if undefined
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Cookie", "x-trpc-source"],
		credentials: true,
		maxAge: 86400,
	});
	return corsMiddleware(c, next);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
