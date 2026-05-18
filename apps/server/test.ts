import { env } from "process";

console.log("DB URL exists:", !!env.DATABASE_URL);
