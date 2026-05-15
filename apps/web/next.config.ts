import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import "@Duty-Roster/env/web";
import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

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
	webpack: (config, { isServer, nextRuntime }) => {
		if (!isServer) {
			// Prevent bundling Node.js modules for client-side code
			if (!config.externals) config.externals = {};
			if (typeof config.externals === "function") {
				const origExternals = config.externals;
				config.externals = async (
					context: string,
					request: string,
					callback: (err?: Error | null, result?: string) => void,
				) => {
					const nodeModules = [
						"fs",
						"path",
						"fs/promises",
						"child_process",
						"net",
						"tls",
						"module",
					];
					if (nodeModules.includes(request)) {
						return callback(null, `commonjs ${request}`);
					}
					return origExternals(context, request, callback);
				};
			} else {
				const externalsObj = config.externals as Record<string, string>;
				externalsObj.fs = "commonjs fs";
				externalsObj.path = "commonjs path";
				externalsObj["fs/promises"] = "commonjs fs/promises";
				externalsObj.child_process = "commonjs child_process";
				externalsObj.net = "commonjs net";
				externalsObj.tls = "commonjs tls";
				externalsObj.module = "commonjs module";
			}
		}
		return config;
	},
};

export default withAnalyzer(nextConfig);
