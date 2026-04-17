import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;

	// Authenticated users trying to access auth → redirect to dashboard
	if (sessionCookie && pathname.startsWith("/auth")) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	// Unauthenticated users trying to access protected paths → redirect to auth
	const protectedPaths = ["/dashboard", "/shift-preference"];
	const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

	if (!sessionCookie && isProtected) {
		return NextResponse.redirect(new URL("/auth", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/shift-preference/:path*", "/auth/:path*"],
};
