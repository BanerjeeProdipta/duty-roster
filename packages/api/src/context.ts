import type { Context as HonoContext } from "hono";

export type Context = {
	auth: null;
	session: any;
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

		return {
			auth: null,
			session,
		};
	} catch {
		return {
			auth: null,
			session: null,
		};
	}
}

export async function createContext({ context }: CreateContextOptions) {
	return createContextFromHeaders(context.req.raw.headers);
}
