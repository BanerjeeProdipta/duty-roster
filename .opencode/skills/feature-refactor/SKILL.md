# Feature-Based Refactoring Skill

Refactor a monorepo (tRPC + Hono + Next.js) from layer-based to feature-based architecture.

## When to Use

User asks to:

- "Refactor to feature-based architecture"
- "Move from layer-based to feature folders"
- "Organize by feature instead of by type"
- "Make it feature-first"

## Workflow

### Step 1: Analyze Current Structure

Scan packages to understand current organization:

```bash
# Find all source directories
find packages/*/src -type d | head -50

# List top-level files per package
for pkg in packages/*; do
  echo "=== $pkg/src ==="
  ls "$pkg/src" 2>/dev/null | head -20
done
```

### Step 2: Identify Features

Features are typically identified by:

- **File/folder names**: `nurse.ts`, `roster.ts`, `shift.ts` → feature: `nurse`, `roster`
- **Domain concepts**: Users, schedules, preferences, auth
- **Router names** in tRPC/API

Map each file to a feature:

| Package | File                             | Feature |
| ------- | -------------------------------- | ------- |
| api     | routers/nurse.ts                 | nurse   |
| api     | routers/roster.ts                | roster  |
| api     | services/roster.ts               | roster  |
| db      | schema/nurse.ts                  | nurse   |
| db      | schema/shift.ts                  | roster  |
| db      | schema/nurse_shift_preference.ts | roster  |
| auth    | src/\*                           | auth    |

### Step 3: Define Target Structure

Per package, reorganize from:

```
src/
├── routers/
├── services/
├── schemas/
├── utils/
```

To:

```
src/
├── features/
│   ├── nurse/
│   │   ├── router.ts
│   │   ├── service.ts
│   │   ├── schema.ts
│   │   └── utils.ts
│   └── roster/
│       ├── router.ts
│       ├── service.ts
│       ├── schema.ts
│       └── utils.ts
├── index.ts
└── trpc.ts  # or app.ts for Hono
```

### Step 4: Migration Checklist

For each feature, create folder and move files:

1. **Create feature folders**

   ```bash
   mkdir -p packages/api/src/features/nurse
   mkdir -p packages/api/src/features/roster
   ```

2. **Move files to feature folders**
   - `routers/nurse.ts` → `features/nurse/router.ts`
   - `services/roster.ts` → `features/roster/service.ts`
   - `schemas/roster.ts` → `features/roster/schema.ts`

3. **Update imports** in moved files
   - Fix relative paths
   - Update `@Duty-Roster/*` imports if needed

4. **Update index exports**
   - `features/nurse/index.ts` exports router
   - Main `index.ts` re-exports from features

### Step 5: Verify

Run type check and build:

```bash
bun run check-types
bun run build
```

## Common Issues

### Circular Dependencies

If features depend on each other:

- Extract shared types to `shared/` or `lib/`
- Use dependency injection via context (tRPC/Hono)

### Index Files

Create feature index for clean exports:

```ts
// features/nurse/index.ts
export { router } from "./router";
export type { nurseRouter } from "./router";
```

### Mixed Files

Some files may span features:

- Split if cleanly separable
- Keep in "main" feature if coupled

## Current Workspace Mapping

Based on analyzed structure:

| Package | Current Features    | Target Folder           | Notes                                        |
| ------- | ------------------- | ----------------------- | -------------------------------------------- |
| api     | nurse, roster       | features/{nurse,roster} | ✅ Successfully refactored                   |
| db      | nurse, roster, auth | schema/                 | ⚠️ Kept - circular dependencies in relations |
| auth    | auth                | src/\*                  | Kept - already small                         |
| ui      | (shared components) | components/             | Keep - shared UI                             |
| env     | web, server, db     | src/\*                  | Keep - env-specific                          |

## Limitation: DB Schema Circular Dependencies

The db package has circular relationships (via `drizzle-orm` relations):

- `nurse.ts` imports `nurse-schedule.ts`
- `nurse-schedule.ts` imports `nurse.ts`
- `nurse_shift_preference.ts` imports `nurse.ts`

To refactor db, you'd need to:

1. Flatten relations into separate `relations.ts` file
2. Or keep tables in flat `schema/` with feature-based exports

## Output Format

When user asks for refactoring, respond with:

1. **Feature list** identified from codebase
2. **Target structure** for each package
3. **Step-by-step migration plan** numbered
4. **Verification commands** to run after

Example:

```markdown
## Analysis

Features found: nurse, roster, auth, manage-users

### API Package

Current:
src/routers/{nurse,roster}.ts
src/services/{roster}.ts
src/schemas/{roster}.ts

Target:
src/features/nurse/router.ts
src/features/roster/{router,service,schema}.ts

## Migration Steps

1. Create folders:
   mkdir -p src/features/{nurse,roster}

2. Move files...

## Verify

bun run check-types
bun run build
```
