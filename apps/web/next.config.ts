import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import "@Duty-Roster/env/web";
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

if (process.env.NODE_ENV === "development") {
	void setupDevPlatform();
}

const withAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
	experimental: {
		externalDir: true,
		// Activates the babel-plugin-react-compiler already listed in dependencies.
		// Automatically memoizes components — especially impactful for the roster grid.
		reactCompiler: true,
		// Next.js 14.3+ built-in tree-shaking for package barrel exports.
		// More reliable than modularizeImports for these packages.
		optimizePackageImports: ["lucide-react", "sonner", "@Duty-Roster/ui"],
	},
	// Keep modularizeImports as a fallback with the CORRECT key (exact import path string,
	// not camelCase — the previous "lucideReact" key was silently doing nothing).
	modularizeImports: {
		"lucide-react": {
			transform: "lucide-react/dist/esm/icons/{{member}}",
		},
	},
};

export default withAnalyzer(nextConfig);
