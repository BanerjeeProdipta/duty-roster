# Duty Roster — AGENTS.md

## Quick start

```sh
bun install             # install deps
bun run dev             # all services (port 3001 web, 3000 server, 3002 voice, 5001 STT)
bun run check           # lint + format (biome check --write .)
bun run check-types     # turbo check-types (tsc --noEmit per package)
bun run build           # turbo build
```

## Monorepo

- **Turborepo** (`turbo.json`), workspaces: `apps/*`, `packages/*`
- **Bun** 1.3.5, **Node** 22.18.0
- Module: ESNext, `verbatimModuleSyntax: true` — use `import type`
- All packages scope `@Duty-Roster/*`
- `tsconfig.base.json` sets `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — always guard array/object indexing against `undefined`

## Apps & ports

| App | Dir | Port | Entry | Deploy target |
|---|---|---|---|---|
| Web (Next.js 15) | `apps/web` | 3001 | `src/app` | Cloudflare Pages (`@cloudflare/next-on-pages`) |
| Server (Hono + tRPC) | `apps/server` | 3000 | `src/index.ts` | Cloudflare Worker (`wrangler deploy`) |
| Voice relay | `apps/ai-server` | 3002 | `src/index.ts` | — |
| STT (Python/Vosk) | `stt/` | 5001 | `server.py` | — |

## Key packages

| Package | Contents |
|---|---|
| `packages/db` | Drizzle ORM schema, migrations, seed (`drizzle-kit`) |
| `packages/api` | tRPC router, roster service, CP-SAT solver (`solver.py`), utils |
| `packages/auth` | Better-Auth config |
| `packages/agent` | LangChain agent |
| `packages/ai-parser` | AI intent parser |
| `packages/env` | Environment validation (Zod, `@t3-oss/env-*`) |
| `packages/ui` | Shared shadcn/ui components, globals.css |
| `packages/config` | Shared tsconfig base, **`rosterConfig.ts`** (coverage targets, solver constraints) |

## Commands

```sh
# Dev (single services)
bun run dev:web         # turbo -F web dev
bun run dev:server      # turbo -F server dev
bun run dev:ai          # turbo -F stt-server dev (voice relay)
bun run dev:stt         # Python STT server (auto-installs deps, downloads model)

# DB (all via turbo -F @Duty-Roster/db)
bun run db:push         # drizzle-kit push
bun run db:generate     # drizzle-kit generate
bun run db:migrate      # drizzle-kit migrate
bun run db:studio       # drizzle-kit studio (persistent)
bun run db:seed         # seed data
bun run db:seed:prods   # seed with production data
bun run db:setup-local  # push + seed (local dev)

# Build & deploy
bun run build:cf        # install + turbo build:cf (Cloudflare bundle)
bun run deploy:server   # cd apps/server && bun run build:cf && wrangler deploy
bun run deploy:web      # cd apps/web && bun run build:cf && wrangler pages deploy
bun run deploy          # install → deploy:server → deploy:web

# Testing
cd packages/api && bun run test    # Jest (ts-jest, ESM)
# e2e: apps/web/e2e/ (Playwright, no root script)
```

## Linting & types

- **Biome only** — no ESLint/Prettier. `bun run check` runs `biome check --write .`.
- Biome auto-organizes imports on format (`assist.actions.source.organizeImports: "on"`). Combined with `verbatimModuleSyntax`, always use `import type` for type-only imports.
- **CSS classes** in `clsx`/`cva`/`cn` calls are auto-sorted by Biome (`useSortedClasses` nursery rule).
- Husky pre-commit runs `lint-staged` (biome check on staged files), not full `bun run check`.

## Database

- `packages/db/src/index.ts` exports a lazy singleton `db`. Auto-selects **Neon HTTP** (Cloudflare/prod) vs **node-postgres Pool** (local Node). Detection uses `globalThis._CF_ENV` and `process.release.name`.
- Schema tables: `nurse`, `nurse_shift_preference`, `nurse_schedule`, `shift`, `agent_document`, plus Better-Auth auth tables.
- `drizzle.config.ts` loads `.env`, `.env.local`, `.env.{mode}`, `.env.{mode}.local`.

## Deploy (Cloudflare)

- Server: `apps/server` → `wrangler deploy`. Env bindings available via `globalThis._CF_ENV` (shimmed in middleware).
- Web: `apps/web` → `@cloudflare/next-on-pages` outputs to `.cloudflare/` → `wrangler pages deploy`.
- Web proxies `/trpc/*` to server via edge route (`apps/web/src/app/trpc/[[...path]]/route.ts`). Auth proxied similarly at `/api/auth/*`.
- CI (`.github/workflows/deploy.yml`) deploys both on push to `main`.

## Conventions & quirks

- **React Compiler**: enabled — do not add `useMemo`/`useCallback` where the compiler handles it.
- **Server bundling**: uses `tsdown` (not tsc). Output: `dist/index.mjs`. Run `bun run build` in `apps/server`.
- **ROSTER_CONFIG** lives at `packages/config/rosterConfig.ts`. Current coverage targets: weekdays `morning=22, evening=4, night=2`; Fridays `morning=3, evening=3, night=2`. Solver constraints include `MAX_CONSECUTIVE_NIGHTS: 2`, `MAX_CONSECUTIVE_DAYS: 6`.
- **CP-SAT solver**: `packages/api/src/roster/solver.py` is spawned as a subprocess by `utils.ts:runSolver()`. Requires `python3` with `ortools` installed.
- **STT setup**: Python venv at `.venv/`, Vosk model at `stt/models/` (download via `scripts/setup-stt.sh`).
- **Package catalog**: shared deps versioned via `package.json` `workspaces.catalog`.
- **Next.js config**: `optimizePackageImports` for `lucide-react`, `sonner`, `@Duty-Roster/ui`; webpack split chunks configured.
- **tRPC tiers**: `publicProcedure` (no auth), `protectedProcedure` (session), `adminProcedure` (session + admin role). All roster mutations use `adminProcedure`.
