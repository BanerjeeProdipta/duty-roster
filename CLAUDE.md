# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install             # install deps
bun run dev             # all services (web :3001, server :3000, voice :3002, STT :5001)
bun run dev:web         # Next.js only (turbo -F web dev)
bun run dev:server      # Hono server only (turbo -F server dev)
bun run dev:ai          # voice relay only (turbo -F stt-server dev)
bun run check           # lint + format (biome check --write .)
bun run check-types     # turbo check-types (tsc --noEmit / tsc -b per package)
bun run build           # turbo build

# Testing
cd packages/api && bun run test    # Jest (ts-jest, ESM) — roster service/utils/solver tests
# e2e: apps/web/e2e/ (Playwright, no root script)

# Database (all proxy to turbo -F @Duty-Roster/db)
bun run db:push          # drizzle-kit push
bun run db:generate      # drizzle-kit generate
bun run db:migrate       # drizzle-kit migrate
bun run db:studio        # open Drizzle Studio
bun run db:seed          # seed data
bun run db:setup-local   # push + seed for local dev

# Deploy (Cloudflare)
bun run deploy:server    # cd apps/server && build:cf && wrangler deploy
bun run deploy:web       # cd apps/web && build:cf && wrangler pages deploy
bun run deploy           # install → deploy:server → deploy:web
```

## Architecture

### Monorepo layout

- **`apps/web`** — Next.js 15 frontend, deployed to Cloudflare Pages (`@cloudflare/next-on-pages`)
- **`apps/server`** — Hono + tRPC backend, deployed to Cloudflare Workers (bundled with `tsdown`, not `tsc`)
- **`apps/ai-server`** — Voice WebSocket relay (Bun)
- **`stt/`** — Python/Vosk speech-to-text server
- **`packages/api`** — tRPC router + roster business logic (service, utils, solver)
- **`packages/db`** — Drizzle ORM schema, migrations, seed
- **`packages/auth`** — Better-Auth config shared across apps
- **`packages/agent`** — LangChain agent (Groq LLM)
- **`packages/ai-parser`** — AI intent parser for the assistant
- **`packages/env`** — Zod-validated environment variables
- **`packages/ui`** — Shared shadcn/ui components
- **`packages/config`** — Shared tsconfig base + `rosterConfig.ts` (coverage targets, solver constraints)

All packages are scoped `@Duty-Roster/*`. `tsconfig.base.json` sets `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, `noUnusedParameters: true` — always guard array/object indexing against `undefined`.

### Request path

The web app never calls the Hono server directly in prod — Next.js edge route `apps/web/src/app/trpc/[[...path]]/route.ts` proxies all `/trpc/*` requests to the Cloudflare Worker (`NEXT_PUBLIC_SERVER_URL`). Auth calls go through `apps/web/src/app/api/auth/[[...path]]/route.ts` similarly.

tRPC procedures are defined in `packages/api/src/roster/router.ts` and assembled at `packages/api/src/router.ts`. The server mounts them at `/trpc/*` via `@hono/trpc-server`.

### Auth & authorization

Better-Auth handles sessions. The tRPC context (`packages/api/src/context.ts`) reads the session from cookies on each request. Three procedure tiers exist in `packages/api/src/trpc.ts`:
- `publicProcedure` — no auth required
- `protectedProcedure` — session required (throws `UNAUTHORIZED` if missing)
- `adminProcedure` — session + `user.role === "admin"` required (throws `FORBIDDEN` otherwise)

All roster mutations (generate, update, delete) use `adminProcedure`.

### Database

`packages/db/src/index.ts` exports a lazy singleton `db`. It auto-selects drivers: **Neon HTTP** (serverless, for Cloudflare/prod) vs **node-postgres Pool** (for local Node dev). Detection logic uses `globalThis._CF_ENV` and `process.release.name`.

Schema tables: `nurse`, `nurse_shift_preference`, `nurse_schedule`, `shift`, `agent_document`, plus Better-Auth auth tables.

### Cloudflare env shim

Cloudflare Workers inject env bindings via `c.env`, not `process.env`. The Hono server middleware copies `c.env` → `globalThis._CF_ENV` (and `process.env`) on every request so that downstream packages can read env vars normally. Web middleware does the same.

### CP-SAT roster solver

Generate flow: `service.ts` builds a solver payload → calls `runSolver()` in `utils.ts` → spawns `packages/api/src/roster/solver.py` as a subprocess (requires `python3` with `ortools` installed) → Python constructs a CP-SAT model (OR-Tools) → returns a roster matrix → service bulk-upserts into `nurse_schedule`.

Coverage targets and constraints (e.g. `MAX_CONSECUTIVE_NIGHTS`, `MAX_CONSECUTIVE_DAYS`) live in `packages/config/rosterConfig.ts` (`ROSTER_CONFIG`) — check that file directly for current numbers rather than assuming, it changes often.

### Frontend patterns

- **tRPC client**: `apps/web/src/utils/trpc.ts` exports `trpc` (TanStack Query proxy) and `trpcClient`. Use `trpc.roster.*` in components via `useSuspenseQuery`/`useMutation`.
- **State**: Zustand for client-side UI state; TanStack Query for server state.
- **React Compiler** is enabled — do not add manual `useMemo`/`useCallback` where the compiler handles it.
- **Features** are organized under `apps/web/src/features/<feature-name>/` with co-located `components/`, `hooks/`, `types/`, `utils/`.
- The roster grid uses `@tanstack/react-virtual` for virtualized row/column rendering.

### Linting & types

- Biome only — no ESLint/Prettier. `bun run check` runs `biome check --write .`.
- Biome auto-organizes imports on format (`assist.actions.source.organizeImports: "on"`). Combined with `verbatimModuleSyntax: true`, always use `import type` for type-only imports.
- CSS classes in `clsx`/`cva`/`cn` calls are auto-sorted by Biome (`useSortedClasses` nursery rule).
- Husky pre-commit runs `lint-staged` (biome check on staged files only), not the full `bun run check`.

### Voice assistant

Feature lives under `apps/web/src/features/ai-assistant/`. The AI assistant popover (`AIPopover.tsx`) connects to the voice relay (`apps/ai-server`) and the LangChain agent endpoint (`POST /api/agent` on the Hono server). The Python STT server (`stt/server.py`) runs Vosk on a WebSocket at `:5001`. Setup requires a `.venv/` Python env and a Vosk model downloaded via `scripts/setup-stt.sh`.
