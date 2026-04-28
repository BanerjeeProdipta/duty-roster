import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";
import "@Duty-Roster/env/web";
import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
	void setupDevPlatform();
}

const nextConfig: NextConfig = {
	experimental: {
		externalDir: true,
	},
};

export default nextConfig;
