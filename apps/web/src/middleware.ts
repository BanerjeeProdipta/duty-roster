import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_PATHS, PATHS } from "./config/paths";

const getServerUrl = () => {
	if (process.env.NODE_ENV === "development") {
		return `http://localhost:${process.env.SERVER_PORT ?? 3000}`;
	}
	return (
		process.env.NEXT_PUBLIC_SERVER_URL ||
		"https://duty-roster-server.duty-roster.workers.dev"
	);
};

const getRole = async (request: NextRequest) => {
	const role = request.cookies.get("user-role")?.value;
	if (role) return role;

	const targetUrl = new URL("/trpc/getCurrentUser", getServerUrl());
	const roleResponse = await fetch(targetUrl.toString(), {
		headers: { cookie: request.headers.get("cookie") || "" },
	});
	const data = await roleResponse.json();
	const userRole = data?.result?.data?.json?.role as string | undefined;
	if (!userRole) return null;
	return userRole;
};

export async function middleware(request: NextRequest) {
	const ctx = (
		request as unknown as { context: { env: Record<string, string> } }
	).context;
	if (ctx?.env) {
		(globalThis as unknown as { _CF_ENV: Record<string, string> })._CF_ENV =
			ctx.env;
	}

	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;
	const isAdminPath = ADMIN_PATHS.some((path) => pathname.startsWith(path));

	if (pathname.startsWith(PATHS.AUTH)) {
		if (!sessionCookie) {
			return NextResponse.redirect(new URL(PATHS.HOME, request.url));
		}
		const role = await getRole(request);
		const destination = role === "admin" ? PATHS.DASHBOARD : PATHS.HOME;
		return NextResponse.redirect(new URL(destination, request.url));
	}

	if (!sessionCookie && isAdminPath) {
		return NextResponse.redirect(new URL(PATHS.AUTH, request.url));
	}

	if (isAdminPath && sessionCookie) {
		const role = await getRole(request);
		if (role !== "admin") {
			return NextResponse.redirect(new URL(PATHS.HOME, request.url));
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		`${PATHS.DASHBOARD}/:path*`,
		`${PATHS.MANAGE_USERS}/:path*`,
		`${PATHS.AUTH}/:path*`,
		PATHS.HOME,
		`${PATHS.ROSTER}/:path*`,
	],
};
