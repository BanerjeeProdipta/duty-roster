# Feature-Based Refactoring Skill

Refactor a monorepo (tRPC + Hono + Next.js + Cloudflare) from layer-based to feature-based architecture with advanced patterns: Feature-Sliced Design, dependency graphs, code generation, feature flags, per-feature testing, migrations, and performance budgets.

## When to Use

User asks to:

- "Refactor to feature-based architecture"
- "Move from layer-based to feature folders"
- "Organize by feature instead of by type"
- "Make it feature-first"
- "Add feature flags" or "make features swappable"
- "Generate a new feature scaffold"
- "Check for circular dependencies in features"
- "Add feature-based testing"

---

## Advanced Feature Architecture

### Feature-Sliced Design (FSD) Layers

Adopt the **Feature-Sliced Design** methodology with these layers per feature:

```
features/{feature}/
├── api/          # tRPC routers, procedures, endpoints (server-side API)
├── model/        # Types, schemas (Zod), Drizzle tables, interfaces
├── lib/          # Pure business logic, utilities, helpers
├── server/       # Hono handlers, middleware, WS handlers (server-only)
├── ui/           # React components, pages (client-only)
├── hooks/        # React hooks, tRPC query hooks
├── stores/       # Zustand stores
├── solver/       # OR-Tools CP-SAT integration (roster-specific)
├── voice/        # Voice command handlers (voice-assistant-specific)
├── index.ts      # Public API barrel
└── __tests__/    # Feature-scoped tests
```

**Slicing rules (strict):**
- `api/` may import from `model/` and `lib/`, never from `ui/`
- `ui/` may import from `model/`, `hooks/`, `stores/`, never from `api/` or `server/` directly
- `lib/` must be pure — no framework imports, no side effects
- `model/` must have zero imports from other feature slices (shared types go to `@Duty-Roster/db`)
- `stores/` may import from `model/` and `lib/`

### Public API Contract (`index.ts`)

Each feature exports only what other features are allowed to consume:

```ts
// features/{feature}/index.ts — PUBLIC API
export type { Nurse, CreateNurseInput } from "./model/types";
export { nurseRouter } from "./api/router";
// ❌ NOT exported: internal hooks, stores, utils, sub-components
```

> **Enforcement**: Run `biome check` with custom rules or a lint script that bans deep imports across features (e.g., `features/nurse/ui/` importing `features/roster/lib/`).

---

## [New] Automated Dependency Graph & Circular Detection

### Visualize Feature Dependencies

Generate a dependency graph using `madge`:

```bash
# Install once
bun add -d madge

# Generate graph for api package
npx madge --image api-features.png packages/api/src/index.ts

# Graph with circular dependency highlighting
npx madge --image deps.png --warning packages/api/src/index.ts

# Check all packages for circular deps
for pkg in packages/*/; do
  echo "=== $pkg ==="
  npx madge --warning "${pkg}src/index.ts" 2>/dev/null || true
done
```

### Circular Dependency Detector Script

Add this script to root `package.json`:

```json
{
  "scripts": {
    "graph:deps": "for pkg in packages/* apps/*; do [ -f \"$pkg/src/index.ts\" ] && npx madge --warning \"$pkg/src/index.ts\" 2>/dev/null || true; done",
    "graph:image": "npx madge --image feature-deps.png packages/api/src/index.ts"
  }
}
```

Also detects circular Drizzle relations in the DB package:

```bash
# Scan for circular drizzle relations
grep -r "relations(" packages/db/src/schema/ | sed 's/.*relations(//;s/,.*//' | sort
```

### Feature Impact Analysis

When asked "what depends on feature X?", use:

```bash
# Find all imports of feature X across the monorepo
rg "features/${FEATURE_NAME}|@Duty-Roster/api/.*${FEATURE_NAME}" --type ts packages/ apps/
```

---

## [New] Feature Scaffolding Code Generator

### Interactive CLI

Create `scripts/scaffold-feature.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

FEATURE_NAME="${1:?Usage: scaffold-feature.sh <feature-name>}"
PKG="${2:-api}"  # default to api package

BASE="packages/$PKG/src/features/$FEATURE_NAME"

if [ -d "$BASE" ]; then
  echo "Feature '$FEATURE_NAME' already exists in $PKG"
  exit 1
fi

echo "Scaffolding feature: $FEATURE_NAME in $PKG"

# Create directory structure
mkdir -p "$BASE"/{api,model,lib,server,__tests__}

# Model — Zod schema + types
cat > "$BASE/model/schema.ts" << 'EOF'
import { z } from "zod";

export const ${FEATURE_NAME}Schema = z.object({
  id: z.string(),
});

export type ${FEATURE_NAME^} = z.infer<typeof ${FEATURE_NAME}Schema>;
export type Create${FEATURE_NAME^}Input = z.input<typeof ${FEATURE_NAME}Schema>;
EOF

# API — tRPC router
cat > "$BASE/api/router.ts" << 'EOF'
import { router, protectedProcedure } from "../../trpc";
import { ${FEATURE_NAME}Schema } from "../model/schema";

export const ${FEATURE_NAME}Router = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    // TODO: implement
    return [];
  }),
  byId: protectedProcedure
    .input(z.string())
    .query(async ({ ctx, input }) => {
      // TODO: implement
      return null;
    }),
});
EOF

# Barrel export
cat > "$BASE/index.ts" << 'EOF'
export { ${FEATURE_NAME}Router } from "./api/router";
export type { ${FEATURE_NAME^}, Create${FEATURE_NAME^}Input } from "./model/schema";
EOF

# Test file
cat > "$BASE/__tests__/router.test.ts" << 'EOF'
import { describe, it, expect } from "bun:test";

describe("${FEATURE_NAME} router", () => {
  it("should be defined", () => {
    expect(true).toBe(true);
  });
});
EOF

echo "✅ Feature '$FEATURE_NAME' scaffolded at $BASE"
echo ""
echo "Next steps:"
echo "  1. Register router in packages/$PKG/src/router.ts"
echo "  2. Add DB schema in packages/db/src/schema/${FEATURE_NAME}.ts"
echo "  3. Add env vars in packages/env if needed"
echo "  4. Run: bun run check-types"
```

Install + usage:

```bash
chmod +x scripts/scaffold-feature.sh
./scripts/scaffold-feature.sh nurse  # or shift, preference, etc.
```

### Turbo-Aware Variant

For the web package (Next.js features):

```bash
#!/usr/bin/env bash
# scaffolds/web-feature.sh
FEATURE="${1:?Usage: web-feature.sh <feature-name>}"
BASE="apps/web/src/features/$FEATURE"

mkdir -p "$BASE"/{components,hooks,stores,types,utils,__tests__}

cat > "$BASE/types/index.ts" << EOF
export interface ${FEATURE^}Props {
  // TODO: define props
}
EOF

cat > "$BASE/hooks/use${FEATURE^}.ts" << EOF
export function use${FEATURE^}() {
  // TODO: implement hook
  return {};
}
EOF

echo "✅ Web feature '$FEATURE' scaffolded at $BASE"
```

---

## [New] Feature Flags System

### Runtime Feature Toggle

Create `packages/config/src/feature-flags.ts`:

```ts
// Feature Flags — runtime swappable features
export type FeatureFlag =
  | "roster:ai-solver"       // Use OR-Tools solver vs. manual
  | "voice:assistant"        // Voice assistant enabled
  | "auth:magic-link"        // Magic link vs. password
  | "roster:auto-publish"    // Auto-publish schedules
  | "dashboard:v2"           // New dashboard layout
  | "shift:bulk-edit";       // Bulk shift editing

export const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  "roster:ai-solver": true,
  "voice:assistant": false,
  "auth:magic-link": false,
  "roster:auto-publish": false,
  "dashboard:v2": false,
  "shift:bulk-edit": false,
};

export class FeatureFlags {
  private flags: Map<FeatureFlag, boolean>;

  constructor(overrides?: Partial<Record<FeatureFlag, boolean>>) {
    this.flags = new Map(
      Object.entries({ ...DEFAULT_FLAGS, ...overrides }) as [FeatureFlag, boolean][],
    );
  }

  isEnabled(flag: FeatureFlag): boolean {
    return this.flags.get(flag) ?? false;
  }

  onlyIf<T>(flag: FeatureFlag, fn: () => T): T | null {
    return this.isEnabled(flag) ? fn() : null;
  }
}

// Singleton for server context
export const featureFlags = new FeatureFlags();
```

### tRPC Middleware for Feature-Gated Procedures

```ts
// In packages/api/src/trpc.ts
import { featureFlags, type FeatureFlag } from "@Duty-Roster/config/feature-flags";
import { TRPCError } from "@trpc/server";

export const featureGated = (flag: FeatureFlag) =>
  protectedProcedure.use(({ ctx, next }) => {
    if (!ctx.featureFlags?.isEnabled(flag)) {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: `Feature '${flag}' is disabled`,
      });
    }
    return next({ ctx });
  });
```

### React Hook for Client-Side Feature Flags

```ts
// packages/ui/src/hooks/useFeatureFlag.ts
import { useMemo } from "react";

type FeatureFlag = string; // import from config

const flags = new URLSearchParams(
  typeof window !== "undefined"
    ? window.location.search.slice(1)
    : "",
);

export function useFeatureFlag(name: FeatureFlag): boolean {
  // Priority: URL param > localStorage > default
  return useMemo(() => {
    if (flags.get(`ff_${name}`) !== null) {
      return flags.get(`ff_${name}`) === "1";
    }
    try {
      const stored = localStorage.getItem(`ff:${name}`);
      if (stored !== null) return stored === "1";
    } catch {}
    return false;
  }, [name]);
}
```

### Environment-Driven Flags

In `wrangler.toml`:

```toml
[vars]
FEATURE_FLAGS = "roster:ai-solver=true,voice:assistant=false"
```

Parsed in `packages/env/src/server.ts`:

```ts
export const featureFlagEnv = {
  FEATURE_FLAGS: z.string().optional(),
};
```

---

## [New] Cross-Feature Communication Patterns

### Pattern 1: Feature Events (pub/sub)

```ts
// packages/api/src/event-bus.ts
type EventMap = {
  "roster:published": { rosterId: string; publishedAt: Date };
  "nurse:updated": { nurseId: string; changes: string[] };
  "shift:assigned": { shiftId: string; nurseId: string };
  "preference:changed": { nurseId: string; weekStart: string };
};

type Handler<E extends keyof EventMap> = (payload: EventMap[E]) => void | Promise<void>;

class FeatureEventBus {
  private handlers = new Map<keyof EventMap, Set<Handler<any>>>();

  on<E extends keyof EventMap>(event: E, handler: Handler<E>): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  async emit<E extends keyof EventMap>(event: E, payload: EventMap[E]): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    await Promise.all([...handlers].map((h) => h(payload)));
  }
}

export const eventBus = new FeatureEventBus();
```

**Usage**: Roster feature emits `"roster:published"` → Nurse feature updates nurse schedule status.

### Pattern 2: Shared Kernel (Avoid Circular Deps)

Shared types that multiple features need migrate to a `shared/` kernel:

```
packages/api/src/
├── features/
│   ├── nurse/
│   ├── roster/
│   └── shared/              # <-- Shared Kernel
│       ├── types.ts          # NurseId, ShiftId, WeekKey, etc.
│       ├── constants.ts      # SHIFT_TYPES, WARD_NAMES
│       ├── errors.ts         # DomainError, NotFoundError
│       └── utils.ts          # Pure utilities used across features
```

**Rule**: The shared kernel must import from NO feature folder. It may import from libs (Zod, Drizzle).

### Pattern 3: Dependency Injection via tRPC Context

Inject cross-feature services through the Hono/tRPC context to avoid direct imports:

```ts
// packages/api/src/context.ts
import type { RosterService } from "./features/roster/api/service";
import type { NurseService } from "./features/nurse/api/service";
import type { ScheduleService } from "./features/schedule/api/service";

export interface FeatureServices {
  roster: RosterService;
  nurse: NurseService;
  schedule: ScheduleService;
}

export interface Context {
  // ... existing auth/db context
  features: FeatureServices;
}
```

**Benefit**: Features depend on interfaces, not concrete implementations. Swap services for testing or feature-flag variants.

---

## [New] Feature-Based Testing Strategy

### Directory Structure

```
packages/api/src/features/roster/
├── __tests__/
│   ├── router.test.ts         # tRPC caller integration tests
│   ├── service.test.ts        # Unit tests for business logic
│   ├── solver.test.ts         # OR-Tools solver tests
│   ├── fixtures/
│   │   ├── roster-data.ts     # Test fixtures
│   │   └── mock-context.ts    # Typed mock context
│   └── helpers.ts             # Shared test utils
├── api/
├── model/
└── lib/
```

### Test Verification Command

```bash
# Run tests per feature
bun test packages/api/src/features/roster

# Run all feature tests with coverage
bun test --coverage packages/api/src/features/

# Run only changed feature tests (turbo filter)
turbo test --filter="[HEAD^1]" --filter="./packages/api"
```

### Feature Integration Test Pattern

```ts
// packages/api/src/features/roster/__tests__/router.test.ts
import { describe, it, expect } from "bun:test";
import { createCallerFactory } from "../../../trpc";
import { createContext } from "../../../context";
import { rosterRouter } from "../api/router";

const createCaller = createCallerFactory(rosterRouter);

describe("roster / list", () => {
  it("returns published rosters for admin", async () => {
    const ctx = await createContext({
      // injected test context with mock session + db
    });
    const caller = createCaller(ctx);
    const result = await caller.list({ weekStart: "2026-05-18" });
    expect(result).toBeDefined();
    expect(result.rosters).toHaveLength(7);
  });
});
```

---

## [New] Migration Validation Toolkit

### Refactoring Completeness Checker

Create `scripts/check-feature-migration.sh`:

```bash
#!/usr/bin/env bash
# Checks if a feature refactoring is 100% complete
# Usage: check-feature-migration.sh <package-path> <feature-name>

PKG="${1:?Usage: check-feature-migration.sh <package-path> <feature-name>}"
FEATURE="${2:?}"

cd "$PKG/src" 2>/dev/null || { echo "❌ Package not found: $PKG"; exit 1; }

MISSING=0

check() {
  local file="$1"
  local desc="$2"
  if [ -f "$file" ]; then
    echo "✅ $desc: $file"
  else
    echo "❌ MISSING $desc: $file"
    MISSING=$((MISSING + 1))
  fi
}

echo "=== Migration Check: $FEATURE ==="
check "features/$FEATURE/api/router.ts"   "tRPC router"
check "features/$FEATURE/model/schema.ts"  "Zod schema"
check "features/$FEATURE/index.ts"         "Barrel export"
check "features/$FEATURE/__tests__/router.test.ts" "Tests"

# Check if old files still exist (should be removed or re-export)
if [ -f "routers/${FEATURE}.ts" ]; then
  echo "⚠️  Old router still exists: routers/${FEATURE}.ts"
  MISSING=$((MISSING + 1))
fi

# Check barrel is registered in parent
if grep -q "${FEATURE}" "router.ts" 2>/dev/null; then
  echo "✅ Registered in router.ts"
else
  echo "❌ NOT registered in router.ts"
  MISSING=$((MISSING + 1))
fi

if [ "$MISSING" -eq 0 ]; then
  echo "✅ All checks passed for '$FEATURE'"
else
  echo "❌ $MISSING issues found for '$FEATURE'"
fi
exit $MISSING
```

### Turbo Pipeline Integration

```json
// turbo.json — add validation tasks
{
  "tasks": {
    "validate:migration": {
      "dependsOn": ["check-types"],
      "inputs": ["src/features/**", "src/router.ts"]
    }
  }
}
```

---

## [New] Feature Performance Budgets

### Per-Feature Bundle Analysis

```bash
# Analyze bundle size per feature in the web app
bun add -d @next/bundle-analyzer

# Generate stats
ANALYZE=true bun run build

# Or use esbuild-visualizer for the API package
bun add -d esbuild-visualizer
npx tsdown --format esm --visualize
```

### Bundle Size Regression Test

```ts
// packages/api/src/features/__tests__/size-budget.test.ts
import { describe, it, expect } from "bun:test";
import fs from "fs";
import path from "path";

const BUDGETS: Record<string, number> = {
  "features/roster": 50_000,   // 50 KB max
  "features/nurse": 30_000,    // 30 KB max
  "features/auth": 20_000,     // 20 KB max
};

describe("feature bundle budgets", () => {
  const dist = path.join(import.meta.dir, "../../../dist");
  if (!fs.existsSync(dist)) return;

  for (const [feature, budget] of Object.entries(BUDGETS)) {
    it(`${feature} stays under ${(budget / 1000).toFixed(0)} KB`, () => {
      const file = path.join(dist, `${feature}/index.js`);
      if (!fs.existsSync(file)) return; // not built
      const size = fs.statSync(file).size;
      expect(size).toBeLessThanOrEqual(budget);
    });
  }
});
```

---

## [New] Feature Health Checks

### Runtime Isolation Verification

```ts
// packages/api/src/features/health.ts
import { router, publicProcedure } from "../trpc";
import { eventBus } from "../event-bus";

export const featureHealthRouter = router({
  checkAll: publicProcedure.query(async ({ ctx }) => {
    const results: Record<string, { status: "ok" | "error"; latency: number }> = {};

    for (const [feature, check] of Object.entries(healthChecks)) {
      const start = performance.now();
      try {
        await check(ctx);
        results[feature] = { status: "ok", latency: performance.now() - start };
      } catch (e) {
        results[feature] = { status: "error", latency: performance.now() - start };
      }
    }

    return results;
  }),
});

type HealthCheck = (ctx: any) => Promise<void>;

const healthChecks: Record<string, HealthCheck> = {
  roster: async (ctx) => {
    // Verify roster service can query DB
    await ctx.db.select().from(schema.shift).limit(1);
  },
  nurse: async (ctx) => {
    await ctx.db.select().from(schema.nurse).limit(1);
  },
  auth: async (ctx) => {
    // Verify auth service is responsive
    if (!ctx.session) throw new Error("Auth not initialized");
  },
  voice: async (ctx) => {
    // Verify WebSocket STT relay is connected
    const wsReady = await fetch("http://localhost:8765/health")
      .then((r) => r.ok)
      .catch(() => false);
    if (!wsReady) throw new Error("STT server unreachable");
  },
};
```

### Health Check Command

```bash
# Via curl
curl -s http://localhost:3000/api/trpc/featureHealth.checkAll | jq

# Or use the tRPC caller in scripts
bun run --eval "
import { createCaller } from '@Duty-Roster/api';
const result = await createCaller({}).featureHealth.checkAll();
console.table(result);
"
```

---

## [New] Feature-Based API Versioning

```ts
// packages/api/src/features/roster/api/router.v2.ts
import { z } from "zod";
import { router, protectedProcedure } from "../../../trpc";

export const rosterRouterV2 = router({
  list: protectedProcedure
    .input(
      z.object({
        weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        includePreferences: z.boolean().default(true), // new in v2
      }),
    )
    .query(async ({ ctx, input }) => {
      // v2 implementation
    }),
});
```

Then mount with version prefix:

```ts
// packages/api/src/router.ts
import { rosterRouter } from "./features/roster/api/router";
import { rosterRouterV2 } from "./features/roster/api/router.v2";

export const appRouter = router({
  roster: rosterRouter,
  "roster.v2": rosterRouterV2,
});
```

---

## [New] Database Schema Per Feature (Drizzle)

### Feature-Dedicated Schema Files

In the db package, organize schema by **domain aggregate** rather than table type:

```
packages/db/src/
├── schema/
│   ├── auth/                  # auth feature
│   │   ├── user.ts
│   │   ├── session.ts
│   │   ├── account.ts
│   │   └── verification.ts
│   ├── roster/                # roster feature
│   │   ├── shift.ts
│   │   └── nurse_shift_preference.ts
│   ├── nurse/                 # nurse feature
│   │   ├── nurse.ts
│   │   └── nurse-schedule.ts
│   ├── agent/                 # agent feature
│   │   └── agent-document.ts
│   └── index.ts               # re-exports all
```

### Breaking Circular Relations

Current issue: `nurse.ts` ↔ `nurse-schedule.ts` circular dependency.

**Solution — Relations Extractor Pattern**:

```ts
// packages/db/src/schema/relations.ts (existing pattern, extend it)
// All relations live in ONE file to break circular imports
import { relations } from "drizzle-orm";
import { nurse } from "./nurse/nurse";
import { nurseSchedule } from "./nurse/nurse-schedule";
import { shift } from "./roster/shift";

export const nurseRelations = relations(nurse, ({ many }) => ({
  schedules: many(nurseSchedule),
}));

export const nurseScheduleRelations = relations(nurseSchedule, ({ one }) => ({
  nurse: one(nurse, {
    fields: [nurseSchedule.nurseId],
    references: [nurse.id],
  }),
}));
```

**Alternative — Lazy relations with `drizzle-orm@0.38+`**:

```ts
// Each schema file lazily imports its relations
import { lazy } from "drizzle-orm";

export const nurse = pgTable("nurse", { ... });

export const nurseRelations = relations(nurse, ({ many }) => ({
  schedules: many(lazy(() => import("./nurse-schedule").then(m => m.nurseSchedule))),
  preferences: many(lazy(() => import("../roster/nurse_shift_preference").then(m => m.nurseShiftPreference))),
}));
```

### Automated Schema Verification

```bash
# Check all feature schemas export their tables
rg "^export const \w+ = pgTable\(" packages/db/src/schema/ --only-matching | sort
```

---

## [New] Feature Exports Map (Tree-Shakable)

Set up sub-path exports per feature in each package's `package.json`:

```jsonc
// packages/api/package.json
{
  "exports": {
    ".": "./src/index.ts",
    "./features/roster": "./src/features/roster/index.ts",
    "./features/nurse": "./src/features/nurse/index.ts",
    "./features/auth": "./src/features/auth/index.ts",
    "./server": "./src/server.ts",
    "./trpc": "./src/trpc.ts"
  }
}
```

Then consumers import only what they need:

```ts
// apps/server/src/index.ts — only imports server/trpc utilities
import { createContext } from "@Duty-Roster/api/server";
import { appRouter } from "@Duty-Roster/api";          // all features

// apps/web — imports only roster feature
import { rosterRouter } from "@Duty-Roster/api/features/roster";
```

> **Turbo tip**: Add an ESLint/Biome rule banning deep imports like `../../features/roster/api/router` — force consumers to use the `@Duty-Roster/api/features/roster` path.

---

## [New] Migration State Machine

Track refactoring progress with a state machine:

```ts
// scripts/migration-state.ts
type FeatureState = "layer" | "in-progress" | "complete" | "blocked";

const state: Record<string, Record<string, FeatureState>> = {
  api: {
    roster: "complete",
    nurse: "complete",
    auth: "in-progress",
    shift: "layer",
  },
  db: {
    roster: "complete",
    nurse: "complete",
    auth: "layer",
    agent: "layer",
  },
  web: {
    "shift-manager": "complete",
    "voice-assistant": "in-progress",
    dashboard: "complete",
    auth: "complete",
    "roster-preview-print": "complete",
  },
};

// Generate CLI table
const chalk = await import("chalk");
for (const [pkg, features] of Object.entries(state)) {
  console.log(`\n${chalk.bold(pkg)}`);
  for (const [feature, s] of Object.entries(features)) {
    const icon = s === "complete" ? "✅" : s === "in-progress" ? "🔄" : s === "blocked" ? "⛔" : "⬜";
    console.log(`  ${icon} ${feature}: ${s}`);
  }
}
```

**Script to update state**:

```bash
#!/usr/bin/env bash
# scripts/set-feature-state.sh <package> <feature> <state>
PKG="$1"
FEATURE="$2"
STATE="$3"
sed -i '' "s|\"$FEATURE\": \"[a-z-]*\"|\"$FEATURE\": \"$STATE\"|" scripts/migration-state.ts
echo "✅ Updated $PKG/$FEATURE → $STATE"
```

---

## [New] Solver Orchestration Pattern (Roster-Specific)

The `solver.py` (OR-Tools CP-SAT) is a roaster-specific engine. Treat it as a **solver sub-feature**:

```
packages/api/src/features/roster/
├── solver-orchestrator/        # <-- Python/OR-Tools bridge
│   ├── index.ts                # Bun child_process spawner
│   ├── types.ts                # Input/output type contracts
│   ├── validator.ts            # Pre-solve validation
│   └── __tests__/
│       ├── solver.bridge.test.ts
│       └── fixtures/
│           ├── input.json
│           └── expected-output.json
├── api/
├── model/
└── lib/
```

### Typed Solver Bridge

```ts
// packages/api/src/features/roster/solver-orchestrator/index.ts
import { spawn } from "bun";
import { z } from "zod";

const SolverInput = z.object({
  nurses: z.array(z.string()),
  shifts: z.array(z.object({
    date: z.string(),
    type: z.enum(["early", "late", "night"]),
  })),
  preferences: z.record(z.string(), z.record(z.string(), z.number())),
  constraints: z.object({
    maxShiftsPerWeek: z.number().default(5),
    minNursesPerShift: z.number().default(2),
  }),
});

const SolverOutput = z.object({
  assignments: z.record(z.string(), z.string()),
  objective: z.number(),
  solveTimeMs: z.number(),
});

export type SolverInput = z.infer<typeof SolverInput>;
export type SolverOutput = z.infer<typeof SolverOutput>;

export async function solve(input: SolverInput): Promise<SolverOutput> {
  const validated = SolverInput.parse(input);
  const proc = spawn({
    cmd: ["python3", new URL("./solver.py", import.meta.url).pathname],
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write(JSON.stringify(validated));
  proc.stdin.end();

  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Solver failed (exit ${exitCode}): ${stderr}`);
  }

  return SolverOutput.parse(JSON.parse(stdout));
}
```

---

## [New] Output Generation Shortcuts

When user asks for any of the following, respond with the corresponding section:

| Request | Section |
|---------|---------|
| "Scaffold a new feature" | → **Feature Scaffolding Code Generator** |
| "Check refactoring completeness" | → **Migration Validation Toolkit** |
| "Add feature flags" | → **Feature Flags System** |
| "Show me feature dependencies" | → **Automated Dependency Graph** |
| "Performance / bundle size" | → **Feature Performance Budgets** |
| "Cross-feature communication" | → **Cross-Feature Communication Patterns** |
| "DB schema organization" | → **Database Schema Per Feature** |
| "Health check" | → **Feature Health Checks** |
| "API versioning" | → **Feature-Based API Versioning** |
| "Test strategy" | → **Feature-Based Testing Strategy** |
| "Migration state" | → **Migration State Machine** |
| "Solver orchestration" | → **Solver Orchestration Pattern** |

## Current Workspace Mapping

| Package | Current Features | Target Folder | Notes |
| ------- | ---------------- | ------------- | ----- |
| api | roster (full: api/model/lib/server/solver) | `features/roster/` | ✅ Refactored. Has solver sub-orchestrator |
| web | shift-manager, voice-assistant, dashboard, auth, roster-preview-print | `features/{...}` | ✅ Component-level feature slices |
| db | auth, nurse, roster, agent | `schema/{auth,nurse,roster,agent}/` | ⚠️ Relations extracted to `relations.ts` |
| auth | auth | `src/` | ✅ Already small |
| ui | (shared components) | `components/` | Keep - shared UI |
| env | web, server, db | `src/` | Keep - env-specific |
| agent | (stub) | `src/features/` | 🆕 Ready for scaffolding |

---

This skill provides comprehensive advanced patterns for the Duty-Roster monorepo, integrating with its existing tRPC + Hono + Next.js + Cloudflare + OR-Tools + Voice stack.
