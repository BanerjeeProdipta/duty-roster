"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { queryClient } from "@/utils/query-client";

// Dynamically imported so webpack can fully eliminate this from production bundles.
const ReactQueryDevtools = dynamic(
	() =>
		import("@tanstack/react-query-devtools").then(
			(mod) => mod.ReactQueryDevtools,
		),
	{ ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === "development" && (
				<ReactQueryDevtools buttonPosition="bottom-left" />
			)}
		</QueryClientProvider>
	);
}
