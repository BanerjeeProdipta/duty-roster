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
			const hasCookie = headers.has("cookie");
			console.warn(
				`tRPC Context: No session found. (Cookie present: ${hasCookie})`,
			);
		} else {
			console.log(`tRPC Context: Active session for user ${session.user.id}`);
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
