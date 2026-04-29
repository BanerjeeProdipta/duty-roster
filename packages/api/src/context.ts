import type { Context as HonoContext } from "hono";

export type Context = {
	auth: null;
	session: unknown;
};

export type CreateContextOptions = {
	context: HonoContext;
};

async function getSessionWithRole(headers: Headers) {
	const { auth } = await import("@Duty-Roster/auth");
	const session = await auth.api.getSession({ headers });

	if (!session?.user?.id) {
		return session;
	}

	const { createDb } = await import("@Duty-Roster/db");
	const db = createDb();
	const user = await db.query.user.findFirst({
		where: (users, { eq }) => eq(users.id, session.user.id),
	});

	return {
		...session,
		user: {
			...session.user,
			role: user?.role || "user",
		},
	};
}

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

		const session = await getSessionWithRole(headers);

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

		const session = await getSessionWithRole(request.headers);

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
