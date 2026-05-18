import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "../..");
const mode = process.env.NODE_ENV || "development";

for (const envFile of [
	resolve(rootDir, ".env"),
	resolve(rootDir, ".env.local"),
	resolve(rootDir, `.env.${mode}`),
	resolve(rootDir, `.env.${mode}.local`),
]) {
	dotenv.config({ path: envFile, override: true, quiet: true });
}

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url: process.env.DATABASE_URL || "",
	},
});
