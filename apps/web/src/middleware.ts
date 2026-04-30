import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	// Populate globalThis._CF_ENV for other server-side code
	// On Cloudflare Pages, environment variables are available on the request context
	const ctx = (
		request as unknown as { context: { env: Record<string, string> } }
	).context;
	if (ctx?.env) {
		(globalThis as unknown as { _CF_ENV: Record<string, string> })._CF_ENV =
			ctx.env;
	}

	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;

	// Authenticated users trying to access auth → redirect to dashboard
	if (sessionCookie && pathname.startsWith("/auth")) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	// Unauthenticated users trying to access protected paths → redirect to auth
	const protectedPaths = ["/dashboard", "/manage-users", "/roster"];
	const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

	if (!sessionCookie && isProtected) {
		return NextResponse.redirect(new URL("/auth", request.url));
	}

	return NextResponse.next();
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
