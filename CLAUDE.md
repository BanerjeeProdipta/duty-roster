# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
bun install             # install deps
bun run dev             # all services (web :3001, server :3000, voice :3002, STT :5001)
bun run dev:web         # Next.js only
bun run dev:server      # Hono server only
bun run check           # lint + format (biome check --write .)
bun run check-types     # tsc --noEmit across all packages
bun run build           # turbo build

# Testing
cd packages/api && bun run test    # Jest unit tests (roster utils)
# e2e: apps/web/e2e/ (Playwright, no root script)

# Database
bun run db:push          # push schema changes (drizzle-kit)
bun run db:generate      # generate migrations
bun run db:studio        # open Drizzle Studio
bun run db:setup-local   # push + seed for local dev
```

## Architecture

### Monorepo layout

- **`apps/web`** — Next.js 15 frontend, deployed to Cloudflare Pages
- **`apps/server`** — Hono + tRPC backend, deployed to Cloudflare Workers
- **`apps/ai-server`** — Voice WebSocket relay (Bun)
- **`stt/`** — Python/Vosk speech-to-text server
- **`packages/api`** — tRPC router + roster business logic (service, utils, solver)
- **`packages/db`** — Drizzle ORM schema, migrations, seed
- **`packages/auth`** — Better-Auth config shared across apps
- **`packages/agent`** — LangChain agent (Groq LLM)
- **`packages/ai-parser`** — AI intent parser for the assistant
- **`packages/env`** — Zod-validated environment variables
- **`packages/ui`** — Shared shadcn/ui components
- **`packages/config`** — Shared tsconfig base

### Request path

The web app never calls the Hono server directly in prod — Next.js edge route `apps/web/src/app/trpc/[[...path]]/route.ts` proxies all `/trpc/*` requests to the Cloudflare Worker (`NEXT_PUBLIC_SERVER_URL`). Auth calls go through `apps/web/src/app/api/auth/[[...path]]/route.ts` similarly.

tRPC procedures are defined in `packages/api/src/roster/router.ts` and assembled at `packages/api/src/router.ts`. The server mounts them at `/trpc/*` via `@hono/trpc-server`.

### Auth & authorization

Better-Auth handles sessions. The tRPC context (`packages/api/src/context.ts`) reads the session from cookies on each request. Three procedure tiers exist in `packages/api/src/trpc.ts`:
- `publicProcedure` — no auth required
- `protectedProcedure` — session required
- `adminProcedure` — session + `user.role === "admin"` required

All roster mutations (generate, update, delete) use `adminProcedure`.

### Database

`packages/db/src/index.ts` exports a lazy singleton `db`. It auto-selects drivers: **Neon HTTP** (serverless, for Cloudflare/prod) vs **node-postgres Pool** (for local Node dev). Detection logic uses `globalThis._CF_ENV` and `process.release.name`.

Schema tables: `nurse`, `nurse_shift_preference`, `nurse_schedule`, `shift`, `agent_document`, plus Better-Auth auth tables.

### Cloudflare env shim

Cloudflare Workers inject env bindings via `c.env`, not `process.env`. The Hono server middleware copies `c.env` → `globalThis._CF_ENV` (and `process.env`) on every request so that downstream packages can read env vars normally. Web middleware does the same.

### CP-SAT roster solver

Generate flow: `service.ts` builds a solver payload → calls `runSolver()` in `utils.ts` → spawns `packages/api/src/roster/solver.py` as a subprocess → Python constructs a CP-SAT model (OR-Tools) → returns a roster matrix → service bulk-upserts into `nurse_schedule`.

Daily coverage targets: weekdays `morning=20, evening=3, night=2`; Fridays `morning=3, evening=3, night=2`.

### Frontend patterns

- **tRPC client**: `apps/web/src/utils/trpc.ts` exports `trpc` (TanStack Query proxy) and `trpcClient`. Use `trpc.roster.*` in components via `useSuspenseQuery`/`useMutation`.
- **State**: Zustand for client-side UI state; TanStack Query for server state.
- **React Compiler** is enabled — do not add manual `useMemo`/`useCallback` where the compiler handles it.
- **Features** are organized under `apps/web/src/features/<feature-name>/` with co-located `components/`, `hooks/`, `types/`, `utils/`.
- The roster grid uses `@tanstack/react-virtual` for virtualized row/column rendering.

### Linting & types

Biome only — no ESLint. `biome check --write .` fixes lint and formatting. Husky pre-commit runs `lint-staged`. Use `import type` for type-only imports (`verbatimModuleSyntax: true`).

### Voice assistant

Feature lives under `apps/web/src/features/ai-assistant/`. The AI assistant popover (`AIPopover.tsx`) connects to the voice relay (`apps/ai-server`) and the LangChain agent endpoint (`POST /api/agent` on the Hono server). The Python STT server (`stt/server.py`) runs Vosk on a WebSocket at `:5001`. Setup requires `.venv/` Python env and Vosk model downloaded via `scripts/setup-stt.sh`.
