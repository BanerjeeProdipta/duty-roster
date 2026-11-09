"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState } from "react";
import { getQueryClient } from "@/utils/query-client";

const ReactQueryDevtools = lazy(() =>
	import("@tanstack/react-query-devtools").then((mod) => ({
		default: mod.ReactQueryDevtools,
	})),
);

export default function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(getQueryClient);

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === "development" && (
				<Suspense fallback={null}>
					<ReactQueryDevtools buttonPosition="bottom-left" />
				</Suspense>
			)}
		</QueryClientProvider>
	);
}
