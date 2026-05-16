import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import "@Duty-Roster/env/web";
import path from "node:path";
import { fileURLToPath } from "node:url";
import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Mark Node.js modules as not bundled for client-side
			config.resolve.alias = {
				...config.resolve.alias,
				fs: false,
				path: false,
				child_process: false,
				net: false,
				tls: false,
				crypto: false,
				module: false,
			};

			// Always externalize large WASM-based libraries for Cloudflare Pages
			// These will be loaded from CDN instead of bundled
			config.resolve.alias["onnxruntime-web"] = false;

			// Optimize code splitting for edge runtime
			config.optimization = {
				...config.optimization,
				splitChunks: {
					chunks: "all",
					cacheGroups: {
						// Core UI framework
						react: {
							test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
							name: "react",
							priority: 30,
							reuseExistingChunk: true,
						},
						// UI components
						ui: {
							test: /[\\/]node_modules[\\/](@Duty-Roster\/ui|shadcn)[\\/]/,
							name: "ui",
							priority: 25,
							reuseExistingChunk: true,
						},
						// Query and form handling
						query: {
							test: /[\\/]node_modules[\\/](@tanstack|@trpc)[\\/]/,
							name: "query",
							priority: 20,
							reuseExistingChunk: true,
						},
						// Vendor libraries
						vendor: {
							test: /[\\/]node_modules[\\/]/,
							name: "vendor",
							priority: 10,
							reuseExistingChunk: true,
							enforce: true,
						},
					},
				},
			};
		}

		return config;
	},
};
