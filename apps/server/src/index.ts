// Polyfill process for Cloudflare Workers
if (typeof process === "undefined") {
	(
		globalThis as unknown as { process: { env: Record<string, string> } }
	).process = {
		env: {},
	};
}

import "@Duty-Roster/env/server";
import { createContext } from "@Duty-Roster/api/context";
import { appRouter } from "@Duty-Roster/api/server";
import { createAuth } from "@Duty-Roster/auth";
import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

type Bindings = {
	DATABASE_URL: string;
	BETTER_AUTH_SECRET: string;
	BETTER_AUTH_URL: string;
	CORS_ORIGIN: string;
	GROQ_API_KEY?: string;
	NODE_ENV?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use(logger());

// Middleware to shim environment variables for packages that use process.env
app.use("*", async (c, next) => {
	(globalThis as unknown as { _CF_ENV: Record<string, string> })._CF_ENV =
		c.env as Record<string, string>;
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
		origin: (origin) => {
			if (!origin) return c.env.CORS_ORIGIN || "*";
			if (
				origin.endsWith(".duty-roster-8cw.pages.dev") ||
				origin === "https://duty-roster-8cw.pages.dev" ||
				origin === "http://localhost:3000" ||
				origin === "http://localhost:3001"
			) {
				return origin;
			}
			return c.env.CORS_ORIGIN || "*";
		},
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "Cookie", "x-trpc-source"],
		credentials: true,
		maxAge: 86400,
	});
	return corsMiddleware(c, next);
});

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	const xForwardedHost = c.req.header("x-forwarded-host");
	const xForwardedProto = c.req.header("x-forwarded-proto") || "https";
	let baseURL = c.env.BETTER_AUTH_URL;

	if (xForwardedHost) {
		baseURL = `${xForwardedProto}://${xForwardedHost}/api/auth`;
	}

	return createAuth({ baseURL }).handler(c.req.raw);
});

app.use(
	"/trpc/*",
	trpcServer({
		router: appRouter,
		createContext: (_opts, context) => {
			return createContext({ context });
		},
	}),
);

app.post("/api/agent", async (c) => {
	try {
		const { text, history } = await c.req.json<{
			text: string;
			history?: { role: string; content: string }[];
		}>();

		if (!text || typeof text !== "string") {
			return c.json({ error: "Missing or invalid 'text' field" }, 400);
		}

		const { resolveBengaliToEnglish } = await import("@Duty-Roster/ai-parser");
		const resolvedText = resolveBengaliToEnglish(text);

		const { buildAgent } = await import("@Duty-Roster/agent");

		const agent = buildAgent();

		const messages = [
			...(history || []).map((m) =>
				m.role === "user"
					? { role: "human", content: resolveBengaliToEnglish(m.content) }
					: { role: "assistant", content: m.content },
			),
			{ role: "human", content: resolvedText },
		];

		const result = await Promise.race([
			agent.invoke({
				messages,
			}),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject(new Error("Agent timed out")), 30000),
			),
		]);

		const lastMessage = result.messages[result.messages.length - 1];
		const response =
			typeof lastMessage?.content === "string" ? lastMessage.content : "";

		return c.json({ response });
	} catch (e) {
		console.error("[agent] error:", e);
		return c.json({ error: (e as Error).message }, 500);
	}
});

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
