import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface LoadEnvOptions {
	/** Base directory to search for .env files */
	baseDir?: string;
	/** Environment mode (development, production, test) */
	mode?: "development" | "production" | "test";
	/** Additional env file paths to load */
	customPaths?: string[];
}

/**
 * Load environment variables from .env files in the correct order.
 * Later files override earlier ones.
 *
 * Order of precedence:
 * 1. .env (base defaults)
 * 2. .env.local (local overrides, not committed)
 * 3. .env.<mode> (environment-specific)
 * 4. .env.<mode>.local (environment-specific local overrides)
 */
export function loadEnv(options: LoadEnvOptions = {}) {
	const { baseDir = process.cwd(), mode = process.env.NODE_ENV as any ?? "development", customPaths = [] } = options;

	const envFiles = [
		path.resolve(baseDir, ".env"),
		path.resolve(baseDir, ".env.local"),
		mode && path.resolve(baseDir, `.env.${mode}`),
		mode && path.resolve(baseDir, `.env.${mode}.local`),
		...customPaths,
	].filter(Boolean) as string[];

	// Load each env file, later files override earlier ones
	for (const envFile of envFiles) {
		dotenv.config({ path: envFile, override: true, quiet: true });
	}
}

/**
 * Load environment variables for Cloudflare Workers runtime.
 * In Workers, environment variables are injected via wrangler.toml [vars].
 * This function ensures compatibility by checking for _CF_ENV global.
 */
export function loadWorkerEnv() {
	// In Cloudflare Workers, env vars are passed to the handler
	// They're available via globalThis._CF_ENV (set by wrangler)
	if (typeof globalThis !== "undefined" && (globalThis as any)._CF_ENV) {
		const cfEnv = (globalThis as any)._CF_ENV;
		for (const [key, value] of Object.entries(cfEnv)) {
			if (typeof value === "string" && !process.env[key]) {
				process.env[key] = value;
			}
		}
	}
}

/**
 * Initialize environment for web (Next.js) applications.
 * Loads from root .env first, then app-specific .env.<mode> overrides.
 */
export function initWebEnv() {
	const rootDir = path.resolve(__dirname, "../../..");
	const webDir = path.resolve(rootDir, "apps/web");
	const mode = (process.env.NODE_ENV as any) ?? "production";

	loadEnv({ baseDir: rootDir, mode });
	loadEnv({ baseDir: webDir, mode });
}

/**
 * Initialize environment for server (Hono/Cloudflare) applications.
 */
export function initServerEnv() {
	const rootDir = path.resolve(__dirname, "../../..");
	const serverDir = path.resolve(rootDir, "apps/server");
	const mode = (process.env.NODE_ENV as any) ?? "production";

	loadEnv({ baseDir: rootDir, mode });
	loadEnv({ baseDir: serverDir, mode });
}

/**
 * Initialize environment for database package.
 */
export function initDbEnv() {
	const rootDir = path.resolve(__dirname, "../../..");
	loadEnv({ baseDir: rootDir, mode: process.env.NODE_ENV as any });
}

/**
 * Initialize environment for auth package.
 */
export function initAuthEnv() {
	const rootDir = path.resolve(__dirname, "../../..");
	loadEnv({ baseDir: rootDir, mode: process.env.NODE_ENV as any });
}
