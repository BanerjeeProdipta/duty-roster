---
name: duty-roster-api
description: tRPC API endpoint development for the Duty Roster server. Use when adding or modifying tRPC procedures, Zod schemas, service logic, or DB queries. Filenames: packages/api/src/roster/schema.ts, db.ts, service.ts, router.ts, index.ts, apps/server/src/index.ts.
---

# duty-roster-api

tRPC v11 with Hono. All repo-specific API logic lives in `packages/api/src/roster/`.

## The 4-file pattern

Every endpoint touches these files in order:

```
schema.ts   →   db.ts   →   service.ts   →   router.ts
(Zod I/O)     (queries)    (business logic)   (tRPC registration)
```

### 1. schema.ts — Zod input/output

Define input and output Zod schemas. Export inferred types.

```typescript
import { z } from "zod";

export const myActionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
});

export type MyAction = z.infer<typeof myActionSchema>;
```

Conventions:
- Use `.refine()` for cross-field validation (e.g. sum of preferences ≤ 100).
- Use `.optional().default(x)` for optional fields with defaults.
- Use `.int().positive().max(N)` for numeric bounds.

### 2. db.ts — Database queries

Import `db` and `schema` from `@Duty-Roster/db`. Use Drizzle ORM query builder or raw SQL for complex joins.

```typescript
import { db, schema } from "@Duty-Roster/db";
import { eq } from "drizzle-orm";

export async function findMyEntity(id: string) {
  return db.select().from(schema.nurse).where(eq(schema.nurse.id, id));
}
```

Conventions:
- Use `.returning()` on mutations to get back the inserted/updated row.
- Use raw SQL (template strings passed to `db.execute()`) for complex CTEs or pagination — see `findSchedulesAndPreferencesByDateRange`.

### 3. service.ts — Business logic

Orchestrate DB calls, validation, and cross-cutting concerns.

```typescript
export async function myAction(input: MyAction) {
  // validate, transform, call db, return
  return findMyEntity(input.id);
}
```

The `generateRoster` function shows the full pattern: fetch prefs → build coverage → call solver → bulk-insert results.

### 4. router.ts — tRPC registration

Import `publicProcedure`, `protectedProcedure`, or `adminProcedure` from `../trpc`. Three auth tiers:

```typescript
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc";
import { z } from "zod";

export const myRouter = router({
  getItems: publicProcedure
    .input(z.object({ /* ... */ }))
    .output(myOutputSchema)
    .query(({ input }) => service.getItems(input)),

  createItem: adminProcedure
    .input(z.object({ /* ... */ }))
    .mutation(({ input }) => service.createItem(input)),
});
```

Rules:
- Use `.query()` for reads, `.mutation()` for writes.
- Add `.output()` for type-safe response validation.
- Barrel-export the router from `packages/api/src/roster/index.ts`.

## Procedure auth tiers

| Procedure | Role | When to use |
|---|---|---|
| `publicProcedure` | None | Data reads, auth endpoints |
| `protectedProcedure` | Authenticated | User-specific data |
| `adminProcedure` | Admin role | Mutations, sensitive ops |

## Export chain

```
packages/api/src/roster/router.ts     →   index.ts (barrel)
packages/api/src/server.ts            →   appRouter (combines all routers)
apps/server/src/index.ts              →   trpcServer({ router: appRouter })
```

## Server entry (`apps/server/src/index.ts`)

Hono app with:
- CORS (allows localhost:3000, 3001 and *.pages.dev)
- `process.env` shim → `globalThis._CF_ENV`
- tRPC handler at `/trpc/*`
- Better-Auth handler at `/api/auth/*`
- Agent endpoint at `/api/agent`
