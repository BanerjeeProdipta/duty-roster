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
export const queryClient = new QueryClient({
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
