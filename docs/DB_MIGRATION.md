# Technical PRD: PostgreSQL Local Development + Neon Production

## Overview

This PRD defines the database strategy for `duty-roster`.

- Local development uses a **native PostgreSQL instance**
- Production uses **Neon serverless PostgreSQL**
- Local development is initialized using the **`prods` table/data** as a production-like seed
- The existing **Drizzle ORM database package** remains the single database access layer

## Goals

- Provide a reliable local development database that mirrors production behavior
- Keep production data on Neon and prevent direct local use of live prod credentials
- Make local environment setup repeatable using `prods` data as the initial dump
- Preserve the current Drizzle ORM database and migration workflow
- Avoid database configuration drift between environments

## Current State

- `packages/db/src/index.ts` currently creates a Neon DB client via `@neondatabase/serverless`
- `packages/env/src/db.ts` validates a required `DATABASE_URL`
- `packages/db/drizzle.config.ts` reads `DATABASE_URL` for migrations
- `packages/db/src/seed.ts` currently seeds hardcoded demo records
- Environment loading supports app-level and root `.env` files

## Requirements

### 1. Development Database

- Use **local PostgreSQL** for development instead of Neon
- Local connection should be configured via `DATABASE_URL` in development mode
- Example local URL:
  - `postgresql://user:password@localhost:5432/duty_roster_dev`
- All local development database operations must use local Postgres only

### 2. Production Database

- Use **Neon serverless PostgreSQL** for production
- Production `DATABASE_URL` must be injected from deployment secrets or Cloudflare config
- Production code must connect to Neon only when `NODE_ENV === "production"` or via explicit prod config

### 3. Environment Variable Handling

- Keep `DATABASE_URL` as the single required DB connection string in `packages/env/src/db.ts`
- Use `.env.development.local` or `.env.local` for local Postgres values
- Use `.env.production` and deployment secrets for Neon values
- Keep local env files out of source control

### 4. Data Initialization

- Local development should start from a production-like dataset using the **`prods` table/data**
- The local seed workflow should:
  - create the schema
  - load `prods` data into local tables
  - maintain referential integrity
  - avoid pulling live production credentials
- Seed logic must be repeatable and usable by any dev machine

### 5. Migration Compatibility

- Continue to use **Drizzle ORM migrations** for both environments
- `packages/db/drizzle.config.ts` must support environment-specific DB URLs
- `bun run db:push`, `bun run db:migrate`, and related commands must work against local Postgres in dev
- Production migration flow must continue to work against Neon

### 6. Security and Safety

- Local dev must never require production Neon URLs
- Production credentials must never be committed
- Local `prods` data must be sanitized before use if copied from production snapshots
- Document clear separation between local and production configs

## Implementation Plan

### A. DB Package Adaptation

- Update `packages/db/src/index.ts` to support:
  - a local Postgres client for development
  - a Neon client for production
- Possible strategy:
  - if `NODE_ENV === "production"` use `neon(env.DATABASE_URL)`
  - else use a local Postgres driver compatible with Drizzle
- Maintain the existing `db` proxy and `schema` exports

### B. Seed Workflow

- Replace or extend `packages/db/src/seed.ts` to:
  - load local Postgres URL
  - seed the schema
  - import the `prods` dataset into local tables
- Add explicit commands for local seeding:
  - `bun run db:seed`
  - `bun run db:seed:prods`
  - `PRODS_SEED_PATH=packages/db/src/prods.json bun run db:seed:prods`
- Keep demo/hardcoded fallback data for quick local bootstrapping if needed

### C. Env Documentation

- Document the local Postgres setup in:
  - `README.md`
  - `packages/env/README.md`
- Clarify:
  - `.env.local` / `.env.development.local` for local Postgres
  - `.env.production` for Neon
  - no direct local Neon access for development

### D. Migration and Deployment

- Ensure `packages/db/drizzle.config.ts` uses `process.env.DATABASE_URL || ""`
- Confirm production deployment secrets deliver Neon URL into `DATABASE_URL`
- Validate local `bun run db:push` against Postgres and production `bun run db:push` against Neon

## Acceptance Criteria

### Dev Acceptance

- Local development runs with `DATABASE_URL` pointed at local Postgres
- `bun run db:push` succeeds locally
- `bun run db:seed` imports `prods` data into the local DB
- App functions correctly in local development mode without Neon

### Prod Acceptance

- Production uses Neon URL only
- App connects successfully to Neon in production
- Production migrations and runtime DB access work with Neon

### Safety Acceptance

- Local env files are gitignored
- No production secrets are committed
- Dev environment is clearly separated from Neon production

## Risks & Mitigations

- **Risk:** Local Postgres vs Neon SQL differences
  - **Mitigation:** use standard PostgreSQL-compatible schema and test both paths
- **Risk:** `prods` dump contains sensitive data
  - **Mitigation:** sanitize or use anonymized sample data for local seeds
- **Risk:** accidental dev connection to production
  - **Mitigation:** document explicit local configs and require local Postgres-only setup

## Suggested Next Steps

1. Update `packages/db/src/index.ts` for dual backend support
2. Extend `packages/env/src/db.ts` with environment-specific validation notes
3. Implement `packages/db/src/seed.ts` to import `prods` data
4. Document local and production DB setup in repo README files
5. Validate with local dev and a production deployment dry run
