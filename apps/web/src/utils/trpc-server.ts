import type { appRouter } from "@Duty-Roster/api";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { headers } from "next/headers";
import { cache } from "react";

const getBaseUrl = () => {
	// Try to get from Cloudflare Request Context
	try {
		const ctx = getRequestContext();
		const env = ctx.env as Record<string, string>;
		if (env.NEXT_PUBLIC_SERVER_URL) return env.NEXT_PUBLIC_SERVER_URL;
	} catch (_e) {
		// Not in a request context or not on Cloudflare
	}

	if (process.env.NEXT_PUBLIC_SERVER_URL)
		return process.env.NEXT_PUBLIC_SERVER_URL;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	return `http://localhost:${process.env.PORT ?? 3001}`;
};

const getClient = cache(() => {
	const url = getBaseUrl();
	console.log("tRPC Client URL:", url);
	return createTRPCClient<typeof appRouter>({
		links: [
			httpBatchLink({
				url: `${url}/trpc`,
				headers: async () => {
					const heads = new Map(await headers());
					heads.set("x-trpc-source", "server");
					return Object.fromEntries(heads);
				},
			}),
		],
	});
});

export const getTRPCServer = cache(async () => getClient());
export const getAuthedTRPCServer = cache(async () => getClient());
