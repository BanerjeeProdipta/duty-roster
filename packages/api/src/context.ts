import type { Context as HonoContext } from "hono";

export type Context = {
	auth: null;
	session: unknown;
};

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContextFromHeaders(
	headers: Headers,
): Promise<Context> {
	try {
		const { auth } = await import("@Duty-Roster/auth");
		const session = await auth.api.getSession({ headers });

		if (!session) {
			console.error(
				"tRPC Context: No session found for headers:",
				JSON.stringify(Object.fromEntries(headers.entries())),
			);
		}

		return {
			auth: null,
			session,
		};
	} catch (error) {
		console.error("tRPC Context Error:", error);
		return {
			auth: null,
			session: null,
		};
	}
}

export async function createContext({ context }: CreateContextOptions) {
	return createContextFromHeaders(context.req.raw.headers);
}
