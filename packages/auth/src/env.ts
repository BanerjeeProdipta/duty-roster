import "dotenv/config";
import { z } from "zod";

const authEnvSchema = z.object({
	BETTER_AUTH_SECRET: z
		.string()
		.min(1)
		.optional()
		.default("a-very-secret-key-that-is-at-least-32-characters-long"),
	BETTER_AUTH_URL: z.string().optional().default("http://localhost:3000"),
	CORS_ORIGIN: z.string().optional().default("http://localhost:3000"),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
});

export const env = authEnvSchema.parse(process.env);
