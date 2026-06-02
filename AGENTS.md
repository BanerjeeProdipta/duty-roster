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
- Root `tsconfig.json` extends `@Duty-Roster/config/tsconfig.base.json`
- Module: ESNext, `verbatimModuleSyntax: true` — use `import type`
- All packages scope `@Duty-Roster/*`

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
| `packages/env` | Environment validation (Zod) |
| `packages/ui` | Shared shadcn/ui components |
| `packages/config` | Shared tsconfig base |

## DB commands (all via turbo)

```sh
bun run db:push          # drizzle-kit push
bun run db:generate      # drizzle-kit generate
bun run db:migrate       # drizzle-kit migrate
bun run db:studio        # drizzle-kit studio (persistent)
bun run db:seed          # seed data
bun run db:seed:prods    # seed with production data
bun run db:setup-local   # push + seed (local dev)
```

`DATABASE_URL` (or `DATABASE_URL_DIRECT`) required in `.env`. The DB module auto-detects Neon HTTP driver for Cloudflare/Prod, pg Pool for Node.

## Testing

```sh
cd packages/api && bun run test    # Jest (ts-jest, ESM, NODE_OPTIONS=--experimental-vm-modules)
```

e2e: `apps/web/e2e/` (Playwright, no root script).

## Deploy (Cloudflare)

```sh
bun run deploy:server   # cd apps/server && wrangler deploy
bun run deploy:web      # @cloudflare/next-on-pages -> wrangler pages deploy
```

CI (`.github/workflows/deploy.yml`) deploys server + web on push to `main`.

## Conventions & quirks

- **Linting**: Biome only (`biome check --write .`). Husky runs `lint-staged` on pre-commit.
- **React Compiler**: enabled (`reactCompiler: true` in next.config.ts) — do not add manual `useMemo`/`useCallback` where the compiler can handle it.
- **Server bundling**: uses `tsdown` (not tsc). Run `bun run build` for the `dist/` output.
- **CF env shim**: server writes `c.env` → `globalThis._CF_ENV` so packages can read via `process.env`. Web middleware does the same.
- **Package catalog**: shared deps versioned via `package.json` `workspaces.catalog`.
- **Next.js config**: `optimizePackageImports` for `lucide-react`, `sonner`, `@Duty-Roster/ui`; webpack split chunks configured.
- **STT setup**: Python venv at `.venv/`, Vosk model at `stt/models/` (download via `scripts/setup-stt.sh`).
