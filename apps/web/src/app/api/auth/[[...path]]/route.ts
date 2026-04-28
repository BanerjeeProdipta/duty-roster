import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
	return handleProxy(request);
}

export async function POST(request: NextRequest) {
	return handleProxy(request);
}

export async function OPTIONS(request: NextRequest) {
	return handleProxy(request);
}

async function handleProxy(request: NextRequest) {
	const url = new URL(request.url);
	const targetBaseUrl =
		process.env.NODE_ENV === "development"
			? `http://localhost:${process.env.SERVER_PORT ?? 3000}`
			: process.env.NEXT_PUBLIC_SERVER_URL ||
				"https://duty-roster-server.duty-roster.workers.dev";
	const targetUrl = new URL(
		url.pathname + url.search,
		targetBaseUrl,
	);

	const headers = new Headers(request.headers);
	// We don't want to pass the host header to the target
	headers.delete("host");
	headers.set("x-forwarded-host", url.host);
	headers.set("x-forwarded-proto", url.protocol.replace(":", ""));

	const response = await fetch(targetUrl.toString(), {
		method: request.method,
		headers,
		body:
			request.method !== "GET" && request.method !== "HEAD"
				? await request.blob()
				: undefined,
		redirect: "manual",
	});

	const responseHeaders = new Headers(response.headers);
	// Ensure CORS is handled correctly if needed, though on the same domain it shouldn't be an issue

	return new Response(response.body, {
		status: response.status,
		headers: responseHeaders,
	});
}
