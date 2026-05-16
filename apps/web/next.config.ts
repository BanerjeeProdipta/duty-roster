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

			if (process.env.NEXT_PUBLIC_BROWSER_PIPER !== "true") {
				config.resolve.alias["@mintplex-labs/piper-tts-web"] = false;
				config.resolve.alias["onnxruntime-web"] = false;
				config.resolve.alias["@diffusionstudio/piper-wasm"] = false;
			}
		}

		return config;
	},
};
