import "dotenv/config";
import { z } from "zod";

const dbEnvSchema = z.object({
	DATABASE_URL: z.string().min(1),
});

export const env = dbEnvSchema.parse(process.env);
