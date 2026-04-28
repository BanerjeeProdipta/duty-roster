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
		const hasCookie = headers.has("cookie");
		if (!hasCookie) {
			return {
				auth: null,
				session: null,
			};
		}

		const { auth } = await import("@Duty-Roster/auth");
		const session = await auth.api.getSession({ headers });

		if (!session) {
			console.warn(
				`tRPC Context (Headers): No session found. (Cookie present: ${hasCookie})`,
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

export async function createContextFromRequest(
	request: Request,
): Promise<Context> {
	try {
		const hasCookie = request.headers.has("cookie");
		if (!hasCookie) {
			return {
				auth: null,
				session: null,
			};
		}

		const { auth } = await import("@Duty-Roster/auth");
		const session = await auth.api.getSession({
			query: Object.fromEntries(new URL(request.url).searchParams),
			headers: request.headers,
		});

		if (!session) {
			console.warn(
				`tRPC Context (Request): No session found for ${request.url}. (Cookie present: ${hasCookie})`,
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
	return createContextFromRequest(context.req.raw);
}
