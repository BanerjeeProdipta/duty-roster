import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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
	const user = session?.user as { role?: string } | null;
	const role = user?.role;

	console.log(
		`[middleware] ${pathname} | loggedIn=${isLoggedIn} | role=${role ?? "none"}`,
	);

	// Redirect logged-in users away from auth pages
	if (isLoggedIn && pathname.startsWith("/auth")) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
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

	// Admin-only routes
	const adminPaths = ["/dashboard", "/manage-users"];
	if (adminPaths.some((path) => pathname.startsWith(path))) {
		if (role !== "admin") {
			return NextResponse.redirect(new URL("/", request.url));
		}
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
			console.log("[middleware] user:", data.user);
		}
		return data;
	} catch (e) {
		console.error("[middleware] getSession error:", e);
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
