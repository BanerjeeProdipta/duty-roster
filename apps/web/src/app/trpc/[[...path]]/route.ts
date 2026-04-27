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
	const targetUrl = new URL(
		url.pathname + url.search,
		process.env.NEXT_PUBLIC_SERVER_URL ||
			"https://duty-roster-server.duty-roster.workers.dev",
	);

	const headers = new Headers(request.headers);
	headers.delete("host");

	const response = await fetch(targetUrl.toString(), {
		method: request.method,
		headers,
		body:
			request.method !== "GET" && request.method !== "HEAD"
				? await request.blob()
				: undefined,
		redirect: "manual",
	});

	return new Response(response.body, {
		status: response.status,
		headers: response.headers,
	});
}
