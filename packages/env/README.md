# Environment Variables Handling

This document describes the unified environment variable handling across the monorepo.

## Overview

The `@Duty-Roster/env` package provides centralized environment variable management for:
- **Web** (Next.js app on Cloudflare Pages)
- **Server** (Hono app on Cloudflare Workers)
- **Worker** (Background workers)
- **Database** (Drizzle ORM)
- **Auth** (Better Auth)

## Architecture

### Env Loader (`packages/env/src/loader.ts`)

The core of the unified env handling is the `loader.ts` module which:

1. **Loads `.env` files in the correct order** (later files override earlier):
   - `.env` (base defaults)
   - `.env.local` (local overrides, not committed)
   - `.env.<mode>` (environment-specific: development/production/test)
   - `.env.<mode>.local` (environment-specific local overrides)

2. **Supports monorepo structure** by checking both app-level and root `.env` files

3. **Handles Cloudflare Workers runtime** via `loadWorkerEnv()` which reads from `globalThis._CF_ENV`

### Package-Specific Initializers

- `initWebEnv()` - For Next.js applications
- `initServerEnv()` - For Hono server applications
- `initDbEnv()` - For database package
- `initAuthEnv()` - For auth package

Each initializer automatically loads environment variables before validation occurs.

## Usage

### Web (Next.js)

```typescript
// apps/web/next.config.ts
import "@Duty-Roster/env/web"; // Automatically loads .env files
```

```typescript
// Any web component
import { env } from "@Duty-Roster/env/web";
console.log(env.NEXT_PUBLIC_SERVER_URL);
```

### Server (Hono/Cloudflare Workers)

```typescript
// apps/server/src/index.ts
import { env } from "@Duty-Roster/env/server";
import { Hono } from "hono";

const app = new Hono<{
  Variables: {
    env: typeof env;
  };
}>();

app.use((c, next) => {
  c.set("env", env);
  return next();
});
```

### Database Package

```typescript
// packages/db/src/index.ts
import { env } from "@Duty-Roster/env/db";
import { drizzle } from "drizzle-orm/neon-http";

const db = drizzle(env.DATABASE_URL);
```

### Auth Package

```typescript
// packages/auth/src/index.ts
import { env } from "@Duty-Roster/env/auth";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
```

## File Structure

```
duty-roster/
├── .env                          # Root environment variables (fallback)
├── .env.example                  # Template for required env vars
├── .gitignore                    # Ignores .env, .env*.local
├── apps/
│   ├── web/
│   │   ├── .env                  # Web-specific env vars
│   │   ├── .env.local            # Local overrides (gitignored)
│   │   ├── .env.production       # Production overrides
│   │   └── .env.example          # Template for web env vars
│   └── server/
│       ├── .env                  # Server-specific env vars
│       ├── .env.local            # Local overrides (gitignored)
│       └── .env.example          # Template for server env vars
└── packages/
    └── env/
        ├── src/
        │   ├── loader.ts         # Unified env loader
        │   ├── web.ts            # Web env validation
        │   ├── server.ts         # Server env validation
        │   ├── db.ts             # Database env validation
        │   └── auth.ts           # Auth env validation
        └── package.json
```

## Environment Variable Precedence

1. **System environment variables** (highest priority)
2. **`.env.<mode>.local`** (e.g., `.env.production.local`)
3. **`.env.<mode>`** (e.g., `.env.production`)
4. **`.env.local`**
5. **`.env`** (lowest priority)
6. **Root `.env`** (for monorepo fallback)

## Cloudflare Deployment

### Cloudflare Pages (Web)

Environment variables defined in `wrangler.toml` `[vars]` are automatically available:

```toml
# apps/web/wrangler.toml
[vars]
NEXT_PUBLIC_SERVER_URL = "https://duty-roster-server.duty-roster.workers.dev"
BETTER_AUTH_URL = "https://duty-roster-server.duty-roster.workers.dev"
```

### Cloudflare Workers (Server)

Environment variables from `wrangler.toml` are injected at runtime:

```toml
# apps/server/wrangler.toml
[vars]
NODE_ENV = "production"
BETTER_AUTH_URL = "https://duty-roster-server.duty-roster.workers.dev/api/auth"
CORS_ORIGIN = "https://duty-roster-8cw.pages.dev"
```

The `loadWorkerEnv()` function reads these from `globalThis._CF_ENV` and merges them into `process.env`.

## Local Development

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update values in `.env.local` (this file is gitignored)

3. For web-specific vars:
   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

4. For server-specific vars:
   ```bash
   cp apps/server/.env.example apps/server/.env.local
   ```

## Production Deployment

### Web (Cloudflare Pages)

```bash
bun run deploy:web
```

This command:
1. Builds the Next.js app with `.env.production`
2. Runs `@cloudflare/next-on-pages` to generate Cloudflare-compatible output
3. Deploys to Cloudflare Pages

### Server (Cloudflare Workers)

```bash
bun run deploy:server
```

This command:
1. Builds the Hono server
2. Deploys to Cloudflare Workers via Wrangler

## Validation

Environment variables are validated using `@t3-oss/env-*` with Zod schemas:

- **Web**: `packages/env/src/web.ts` - Validates `NEXT_PUBLIC_SERVER_URL`
- **Server**: `packages/env/src/server.ts` - Combines db + auth env vars
- **Database**: `packages/env/src/db.ts` - Validates `DATABASE_URL`
- **Auth**: `packages/env/src/auth.ts` - Validates `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`

Validation occurs at build time for web and at runtime for server/workers.

## Troubleshooting

### "Invalid environment variables" error

**Problem**: Build fails with validation error

**Solution**:
1. Ensure `.env` or `.env.local` exists with required variables
2. Check that variable names match exactly (case-sensitive)
3. For production builds, ensure `.env.production` has all required vars

### Variables not available in Cloudflare

**Problem**: Env vars work locally but not in Cloudflare

**Solution**:
1. Add variables to `wrangler.toml` `[vars]` section
2. For secrets, use `wrangler secret put <VAR_NAME>`
3. Redeploy after adding variables

### Monorepo env var resolution

**Problem**: Packages can't find root `.env` file

**Solution**:
The loader automatically checks parent directories for monorepo setups. Ensure:
1. Root `.env` exists
2. App-level `.env` takes precedence over root `.env`
