import { QueryCache, QueryClient } from "@tanstack/react-query";

/**
 * QueryClient is split into its own module so that `provider/index.tsx`
 * (which is statically imported by the root layout) does NOT pull in
 * `@trpc/client` or `@trpc/tanstack-react-query`. Those are only needed
 * in data-fetching hooks which are lazily loaded per-route.
 *
 * Sonner is lazy-imported here so it's excluded from the initial layout
 * bundle — it's only needed when a query actually errors.
 */
function makeQueryClient() {
	return new QueryClient({
		queryCache: new QueryCache({
			onError: (error, query) => {
				// Lazy-import sonner so it's not in the initial layout chunk
				import("sonner").then(({ toast }) => {
					toast.error(error.message, {
						action: {
							label: "retry",
							onClick: () => query.invalidate(),
						},
					});
				});
			},
		}),
	});
}

// Providers is a "use client" component but is still rendered on the server
// for every request. A module-level singleton would be shared across
// requests in the same server process, leaking cached data between users/
// renders. So: a fresh client per server render, one persistent client in
// the browser.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
	if (typeof window === "undefined") {
		return makeQueryClient();
	}
	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}
	return browserQueryClient;
}
