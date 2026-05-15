
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
async function resolvePath(baseDir: string, ...segments: string[]) {
	const path = await import("node:path");
	return path.resolve(baseDir, ...segments);
}

export async function loadEnv(options: LoadEnvOptions = {}) {
	if (typeof process === "undefined" || typeof process.cwd !== "function") {
		return;
	}

	const {
		baseDir = process.cwd(),
		mode = (process.env.NODE_ENV as any) ?? "development",
		customPaths = [],
	} = options;

	const [env, envLocal, envMode, envModeLocal] = await Promise.all([
		resolvePath(baseDir, ".env"),
		resolvePath(baseDir, ".env.local"),
		mode ? resolvePath(baseDir, `.env.${mode}`) : null,
		mode ? resolvePath(baseDir, `.env.${mode}.local`) : null,
	]);

	const envFiles = [env, envLocal, envMode, envModeLocal, ...customPaths].filter(Boolean) as string[];

	const dotenv = await import("dotenv");
	for (const envFile of envFiles) {
		dotenv.default.config({ path: envFile, override: true, quiet: true });
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

async function getWorkspaceRoot() {
	if (typeof process === "undefined" || typeof process.cwd !== "function") {
		return null;
	}

	const { existsSync } = await import("node:fs");
	const path = await import("node:path");

	const cwd = process.cwd();
	const candidates = [
		cwd,
		path.resolve(cwd, ".."),
		path.resolve(cwd, "../.."),
		path.resolve(cwd, "../../.."),
	];

	for (const candidate of candidates) {
		if (existsSync(path.resolve(candidate, ".env"))) {
			return candidate;
		}
	}

	return cwd;
}

/**
 * Initialize environment for web (Next.js) applications.
 * Loads from root .env first, then app-specific .env.<mode> overrides.
 */
export async function initWebEnv() {
	const rootDir = await getWorkspaceRoot();
	if (!rootDir) return;

	const path = await import("node:path");
	const webDir = path.resolve(rootDir, "apps/web");
	const mode = (process.env.NODE_ENV as any) ?? "production";

	loadEnv({ baseDir: rootDir, mode });
	loadEnv({ baseDir: webDir, mode });
}

/**
 * Initialize environment for server (Hono/Cloudflare) applications.
 */
export async function initServerEnv() {
	const rootDir = await getWorkspaceRoot();
	if (!rootDir) return;

	const path = await import("node:path");
	const serverDir = path.resolve(rootDir, "apps/server");
	const mode = (process.env.NODE_ENV as any) ?? "production";

	loadEnv({ baseDir: rootDir, mode });
	loadEnv({ baseDir: serverDir, mode });
}

/**
 * Initialize environment for database package.
 */
export async function initDbEnv() {
	const rootDir = await getWorkspaceRoot();
	if (!rootDir) return;
	loadEnv({ baseDir: rootDir, mode: process.env.NODE_ENV as any });
}

/**
 * Initialize environment for auth package.
 */
export async function initAuthEnv() {
	const rootDir = await getWorkspaceRoot();
	if (!rootDir) return;
	loadEnv({ baseDir: rootDir, mode: process.env.NODE_ENV as any });
}
