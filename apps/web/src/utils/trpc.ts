import type { AppRouter } from "@Duty-Roster/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

// Re-export queryClient so existing imports of `queryClient` from
// "@/utils/trpc" continue to work without changes.
export { queryClient } from "./query-client";

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: "/trpc",
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient: (await import("./query-client")).queryClient,
});
