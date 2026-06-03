---
name: duty-roster-deploy
description: Deployment and CI/CD operations for the Duty Roster project. Use when deploying to Cloudflare, managing wrangler config, debugging build failures, editing CI workflows, or managing environment variables. Filenames: apps/server/wrangler.toml, apps/web/next.config.ts, .github/workflows/deploy.yml, apps/server/package.json, apps/web/package.json.
---

# duty-roster-deploy

Deployment targets: Cloudflare Workers (server) + Cloudflare Pages (web).

## Commands

| Command | What it does |
|---|---|
| `bun run deploy:server` | Build server → `wrangler deploy` |
| `bun run deploy:web` | Build web → `wrangler pages deploy` |
| `bun run deploy` | Install deps → deploy both |

## Build pipeline

### Server (`apps/server/`)
- Uses **tsdown** (not tsc) for bundling → output in `dist/`
- Build command: `bun run build:cf` (runs tsdown with CF-compatible config)
- Deploy: `wrangler deploy`

Common failure: missing polyfill for `process.env` — server entry already includes the shim:
```typescript
if (typeof process === "undefined") {
  (globalThis as any).process = { env: {} };
}
```
And middleware writes `c.env` to `globalThis._CF_ENV`.

### Web (`apps/web/`)
- Uses **@cloudflare/next-on-pages** for Next.js → Cloudflare Pages
- Build command: `bun run build:cf`
- Deploy command: `bun run pages:deploy` (or equivalent wrangler pages deploy)

Common failures:
- Node.js APIs used in client components (check for `fs`, `path`, `crypto` in web bundle)
- Edge runtime incompatibility (check Next.js config `runtime: 'edge'`)
- Large bundle size exceeding CF limits (check webpack split chunks in `next.config.ts`)

## CI/CD (.github/workflows/deploy.yml)

Triggers: push to `main`.

Steps:
1. Checkout repo
2. Install Bun + Node.js 22
3. `bun install`
4. Build server (`cd apps/server && bun run build:cf`)
5. Set worker secrets via `wrangler secret bulk`
6. Deploy server (`npx wrangler deploy`)
7. Deploy web (`bun run deploy:web`)

Required secrets/vars on GitHub:
| Secret/Var | Source |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `DATABASE_URL` | Neon/PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth secret |
| `NEXT_PUBLIC_SERVER_URL` | Public server URL (var) |
| `BETTER_AUTH_URL` | Auth URL (var) |

## Environment variables

Defined and validated in `packages/env/`. Two entry points:
- `@Duty-Roster/env/server` — server-side env vars
- `@Duty-Roster/env/client` — client-safe env vars (prefixed with `NEXT_PUBLIC_`)

Required for local dev `.env`:
```
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001
```

CF env shim: `globalThis._CF_ENV` is populated by Hono middleware (`apps/server/src/index.ts`) and Next.js middleware (`apps/web/src/middleware.ts`) so packages can read via `process.env`.

## Wrangler config

Server config in `apps/server/wrangler.toml`. Check for:
- `compatibility_date` — updates may break polyfills
- `compatibility_flags` — e.g. `nodejs_compat` for Node.js API support
- `routes` or `workers_dev` — routing
- `vars` — static env vars for the worker

## Debugging build failures

1. **Server build fails**: Run `cd apps/server && bun run build:cf` locally and check tsdown output
2. **Web build fails**: Run `cd apps/web && bun run build:cf` locally; check next-on-pages output
3. **Deploy fails**: Check `wrangler deploy` output for auth/secret issues
4. **Runtime error**: Check Cloudflare dashboard → Workers & Pages → duty-roster → Logs

## Secrets management

Use `wrangler secret put <KEY>` from `apps/server/` for individual secrets, or `wrangler secret bulk` for batch. For CI, secrets are managed via GitHub Actions secrets and injected as env vars.
