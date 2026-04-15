import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
	const sessionCookie = getSessionCookie(request);
	const { pathname } = request.nextUrl;

	// Authenticated users trying to access auth → redirect to dashboard
	if (sessionCookie && ["/auth"].includes(pathname)) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	// Unauthenticated users trying to access dashboard → redirect to auth
	if (!sessionCookie && pathname.startsWith("/dashboard")) {
		return NextResponse.redirect(new URL("/auth", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/dashboard/:path*", "/auth"],
};
