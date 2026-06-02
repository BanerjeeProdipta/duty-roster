import { env } from "node:process";

console.log("DB URL exists:", !!env.DATABASE_URL);
