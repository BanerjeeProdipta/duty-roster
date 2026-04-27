import "@Duty-Roster/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	reactCompiler: true,
	experimental: {
		externalDir: true,
	},
};

export default nextConfig;
