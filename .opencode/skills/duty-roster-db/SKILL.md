---
name: duty-roster-db
description: Database schema, migration, and seeding operations for the Duty Roster project. Use when adding/modifying Drizzle ORM tables, running drizzle-kit commands, editing seed data, or inspecting the PostgreSQL schema. Filenames: packages/db/src/schema/*.ts, packages/db/src/seed.ts, packages/db/drizzle.config.ts.
---

# duty-roster-db

Location: `packages/db/`

## Schema files

`packages/db/src/schema/` — one file per table. Each file exports a `pgTable` definition and optionally a `relations` object. Barrel-exported from `index.ts`.

```typescript
// packages/db/src/schema/nurse.ts
import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { nurseSchedule } from "./nurse-schedule";

export const nurse = pgTable("nurse", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const nurseRelations = relations(nurse, ({ many }) => ({
  schedules: many(nurseSchedule),
}));
```

Conventions:
- snake_case column names in DB, camelCase in TypeScript — Drizzle maps them.
- `text("id").primaryKey()` with UUID strings (e.g. `nurse_<uuid>`).
- Enum columns use `pgEnum()` with const arrays (see `shift.ts`).
- Always add the new file to `schema/index.ts` barrel export.

## DB driver auto-detection

`packages/db/src/index.ts` (createDb) selects the driver at runtime:
- **Cloudflare Worker** or **production** → Neon HTTP driver (`@neondatabase/serverless`)
- **Node.js** → pg Pool (`drizzle-orm/node-postgres`)

The `db` proxy singleton is the standard way to access the client.

```typescript
import { db, schema } from "@Duty-Roster/db";
// or equivalently:
import { createDb } from "@Duty-Roster/db";
const db = createDb();
```

## Commands (run from repo root via turbo)

| Command | What it does |
|---|---|
| `bun run db:push` | Push schema to DB (dev — no migration file) |
| `bun run db:generate` | Generate migration files from schema changes |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:studio` | Open Drizzle Studio GUI (persistent) |
| `bun run db:seed` | Seed with development data |
| `bun run db:seed:prods` | Seed from production dump (`prods.json`) |
| `bun run db:setup-local` | `db:push -- --force` + `db:seed:local` in one step |

## Workflow for schema changes

1. Edit or create file in `packages/db/src/schema/`
2. Add export to `schema/index.ts`
3. Run `bun run db:generate` to create migration
4. Run `bun run db:migrate` to apply it
5. (Optional) Update seed script in `packages/db/src/seed.ts` or `prods.json`

## Seed data

Seed script at `packages/db/src/seed.ts`. Uses `prods.json` for production-like data or inline definitions for dev. Run with `bun run db:seed` or `bun run db:seed:prods`.

## Environment

Requires `DATABASE_URL` or `DATABASE_URL_DIRECT` in `.env`. DB package reads via `getDbEnv()` from `@Duty-Roster/env`.
