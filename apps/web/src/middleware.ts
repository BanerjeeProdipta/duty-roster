import { can, PERMISSIONS } from "@Duty-Roster/config/permissions";
import { type NextRequest, NextResponse } from "next/server";

const ROUTE_PERMISSIONS = [
	{ prefix: "/dashboard", permission: PERMISSIONS.VIEW_DASHBOARD },
	{ prefix: "/manage-users", permission: PERMISSIONS.MANAGE_ROSTER },
] as const;

export async function middleware(request: NextRequest) {
	const ctx = (
		request as unknown as { context: { env: Record<string, string> } }
	).context;
	if (ctx?.env) {
		(globalThis as unknown as { _CF_ENV: Record<string, string> })._CF_ENV =
			ctx.env;
	}

	const { pathname } = request.nextUrl;

	// Public paths — always allow, no session check needed
	const publicPrefixes = ["/auth", "/roster"];
	const isPublic =
		pathname === "/" ||
		publicPrefixes.some((path) => pathname.startsWith(path));

	const session = await getSession(request);
	const isLoggedIn = !!session?.session;
	const role = (session?.user as { role?: string } | undefined)?.role;

	// Redirect logged-in users away from auth pages
	if (isLoggedIn && pathname.startsWith("/auth")) {
		const landing = can(role, PERMISSIONS.VIEW_DASHBOARD)
			? "/dashboard"
			: "/roster";
		return NextResponse.redirect(new URL(landing, request.url));
	}

	// Allow public paths through
	if (isPublic) {
		return NextResponse.next();
	}

	// Block all unauthenticated access to protected routes
	if (!isLoggedIn) {
		const redirectUrl = new URL("/auth", request.url);
		redirectUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(redirectUrl);
	}

	// Block access to routes the user's role lacks permission for
	const routeRule = ROUTE_PERMISSIONS.find(({ prefix }) =>
		pathname.startsWith(prefix),
	);
	if (routeRule && !can(role, routeRule.permission)) {
		return NextResponse.redirect(new URL("/roster", request.url));
	}

	return NextResponse.next();
}

async function getSession(request: NextRequest) {
	try {
		const url = new URL("/api/auth/get-session", request.url);
		const response = await fetch(url, {
			headers: request.headers,
		});
		if (!response.ok) return null;
		const data = await response.json();
		if (data?.user) {
			// User session retrieved successfully
		}
		return data;
	} catch (_e) {
		// Session retrieval failed
		return null;
	}
}

export const config = {
	matcher: [
		"/dashboard/:path*",
		"/manage-users/:path*",
		"/roster/:path*",
		"/auth/:path*",
		"/",
	],
};
