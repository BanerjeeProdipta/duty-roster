import { neon } from "@neondatabase/serverless";

const sql = neon(
	"postgresql://neondb_owner:npg_pSD0Xm1crawv@ep-old-sound-aj5gyau9.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require",
);
sql`SELECT 1 as "result"`.then(console.log).catch(console.error);
