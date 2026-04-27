# Shift Generation and Data Flow PRD

## Document Control

- **Product Area:** Duty Roster Scheduling
- **Status:** Draft for implementation and alignment
- **Audience:** Product, Engineering, QA, and Operations
- **Scope:** End-to-end shift lifecycle across generation, update, display, and persistence

## 1. Purpose

This PRD defines the architecture and expected behavior for shift scheduling across the application. It captures how monthly schedules are generated, how nurses' shift preferences are updated, and how data flows between UI, client state, API, and database layers.

The goal is to establish a single source of truth for:

- Shift generation behavior and constraints
- Manual shift updates in roster views
- Preference updates in manage-users views
- Month-boundary and day-count behavior (including 31-day months)
- Validation, persistence, and refresh expectations

## 2. Product Goals and Non-Goals

### Goals

- Generate complete month rosters based on nurse preferences and scheduling constraints.
- Support manual per-day/per-nurse edits with low-latency UX.
- Support nurse preference updates using day-count inputs that map to percentage weights.
- Keep dashboard and manage-users surfaces consistent for the same selected month.
- Ensure month date ranges correctly include all days (e.g., May 31).

### Non-Goals

- Cross-hospital multi-tenant scheduling rules.
- Automatic swap marketplace between nurses.
- Historical analytics/dashboarding beyond current schedule metrics.

## 3. Personas and Primary Workflows

### Admin/Scheduler

- Select target month.
- Generate a roster for that month.
- Review daily shift distribution and nurse-level allocations.
- Make manual fixes for individual shifts.
- Update nurse preference allocations and active status.

### Nurse (Indirectly represented)

- Preferences are modeled in system as weighted percentages per shift type.
- Active status controls whether nurse participates in generation/allocation.

## 4. System Architecture Overview

## Frontend (`apps/web`)

- Next.js App Router with server-rendered page entry points.
- React Query for API caching.
- Zustand store for roster matrix local state and optimistic updates.
- Month selection is URL param driven (`year`, `month`).

## API (`packages/api` + `apps/server`)

- tRPC routers expose roster read/write procedures.
- Service layer contains scheduling business logic and preference normalization.
- DB access layer performs query assembly and persistence operations.

## Database (`packages/db`)

- Canonical entities:
  - `nurse`
  - `shift`
  - `nurse_schedule`
  - `nurse_shift_preference`

## 5. Core Domain Concepts

- **Shift Type:** Morning, Evening, Night. Off is represented as absence of shift assignment (or nullable shift).
- **Preference Weight:** Integer percent per nurse+shift. Total may be normalized by backend when exceeding 100.
- **Monthly Schedule:** Date-bounded set of nurse assignments for selected month.
- **Coverage Metrics:** Per-day assigned counts and required counts; per-nurse assigned metrics and preference-wise metrics.

## 6. Key Components and Ownership

### 6.1 Month Selection and Date Helpers

- `apps/web/src/components/MonthNavigator.tsx`
- `apps/web/src/hooks/useRosterDates.ts`
- `apps/web/src/utils/index.ts`

Responsibilities:

- Derive selected `year/month` from URL.
- Build month date arrays and fetch ranges.
- Compute `totalDays` and date labels for UI.

### 6.2 Dashboard Roster Surface

- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/features/dashboard/components/roster-table/RosterTable.tsx`
- `apps/web/src/features/dashboard/components/roster-table/RosterHeader.tsx`
- `apps/web/src/features/dashboard/components/roster-table/NurseRow.tsx`
- `apps/web/src/features/dashboard/components/roster-table/ShiftDropdown.tsx`
- `apps/web/src/hooks/useGenerateRoster.ts`
- `apps/web/src/hooks/useUpdateShift.ts`
- `apps/web/src/hooks/useScheduleInit.ts`
- `apps/web/src/hooks/useSchedules.ts`
- `apps/web/src/store/roster/useRosterStore.ts`

Responsibilities:

- Fetch selected-month schedules.
- Render virtualized roster table.
- Trigger generate-roster mutation.
- Apply manual shift edits with optimistic updates and server persistence.

### 6.3 Manage Users / Preference Surface

- `apps/web/src/app/manage-users/page.tsx`
- `apps/web/src/features/shift-manager/ShiftAllocationsClient.tsx`
- `apps/web/src/features/shift-manager/components/NurseCard.tsx`
- `apps/web/src/features/shift-manager/hooks/useShiftAllocations.ts`
- `apps/web/src/features/shift-manager/hooks/useNurseCard.ts`
- `apps/web/src/features/shift-manager/utils/index.ts`
- `apps/web/src/hooks/useUpdatePreferences.ts`

Responsibilities:

- Convert schedule response into per-nurse editable preference/day model.
- Validate card totals against selected-month total days.
- Convert day allocations into preference percentages.
- Persist preferences and active status updates.

### 6.4 API and Service Layer

- `packages/api/src/features/roster/router.ts`
- `packages/api/src/features/roster/service.ts`
- `packages/api/src/features/roster/db.ts`
- `packages/api/src/features/roster/schema.ts`

Responsibilities:

- Input validation.
- Roster generation algorithm.
- Schedule retrieval and shaping.
- Shift upsert and preference upsert.

### 6.5 Server and Transport

- `apps/server/src/index.ts`
- `packages/api/src/routers/index.ts`
- `apps/web/src/utils/trpc.ts`
- `apps/web/src/utils/trpc-server.ts`

Responsibilities:

- Host tRPC endpoint.
- Define API root router.
- Client/server callers for web app.

## 7. End-to-End Data Flows

## 7.1 Flow A: Monthly Schedule Fetch and Dashboard Render

1. User lands on dashboard with `year/month` URL params.
2. `dashboard/page.tsx` computes month range and calls `roster.getSchedules`.
3. API validates range and fetches schedules/preferences from DB.
4. Service shapes response into:
  - `nurseRows`
  - `dailyShiftCounts`
5. Client hook (`useScheduleInit`) hydrates React Query + Zustand.
6. `RosterTable` renders date columns and nurse rows for full selected month.

Expected outcome:

- Each day in selected month has a visible column (including day 31 where applicable).
- Header and row metrics align with fetched month range.

## 7.2 Flow B: Generate Roster

1. User clicks generate in roster header.
2. `useGenerateRoster` calls `roster.generateRoster`.
3. Service computes assignments from preference profiles and constraints.
4. DB write path replaces month schedules (delete selected month, insert generated rows in batches).
5. Client refreshes/invalidation updates roster display.

Expected outcome:

- Month roster is regenerated deterministically from current inputs and constraints.
- UI reflects newly generated assignments after mutation settles.

## 7.3 Flow C: Manual Shift Edit

1. User changes a nurse-day cell via shift dropdown.
2. `useUpdateShift` applies optimistic local update (store/query cache).
3. API `roster.updateShift` persists with upsert logic.
4. On success, client keeps updated value; on failure, rollback/refetch path restores consistency.

Expected outcome:

- UX is responsive with immediate visual update.
- Server state eventually matches visible UI.

## 7.4 Flow D: Manage-Users Preference Update

1. Manage-users page fetches month schedules with same API.
2. `useShiftAllocations` maps `preferenceWiseShiftMetrics` to editable day counts.
3. User edits card values (morning/evening/night/off) and toggles active status.
4. `useNurseCard` validates `sum === totalDays`.
5. `convertToPreferences` transforms day counts to percent weights.
6. `useUpdatePreferences` sends update with `daysInMonth`.
7. Backend normalizes and upserts `nurse_shift_preference`.
8. Page refreshes/refetches and card data rehydrates.

Expected outcome:

- Card totals always align with selected month total days.
- Month change triggers recalculation/sync in UI draft state.

## 8. State Management and Synchronization Model

### Client State Layers

- **React Query:** API source-of-truth cache for schedules and shifts.
- **Zustand roster store:** Local roster state for cross-component access and optimistic mutations.
- **Local component draft state:** `NurseCard` edit buffers before save.

### Synchronization Rules

- Server fetch initializes query + store.
- Manual edits optimistically mutate local layers, then persist remotely.
- Manage-users card draft must re-sync when:
  - Nurse props change
  - `totalDays` changes from month switch

Failure to re-sync can produce stale totals (for example `30/31` warnings after month switch).

## 9. Data Model and Contract Details

### Core Tables

- `nurse`
- `shift`
- `nurse_schedule` (date-level assignments; shift may be nullable to represent off)
- `nurse_shift_preference` (composite identity nurse+shift, weight, active)

### API Contracts (Roster Router)

- `getSchedules({ startDate, endDate })`
- `getShifts()`
- `generateRoster({ year, month })`
- `updateShift({ nurseId, date, shiftId })`
- `updateNurseShiftPreferences({ preferences, daysInMonth })`

## 10. Scheduling Rules and Constraints (Current Behavior)

- Generation considers preference weights and active status.
- Constraints include fairness balancing and sequence constraints.
- Friday-specific logic is applied to required counts/rules.
- Off-day behavior is implicit through missing/null shift assignment.

Note: Friday rules currently appear in multiple locations (generation and UI metrics), which introduces risk of behavioral drift if changed in one place only.

## 11. Date and Month Semantics

## Required Policy

- Month range must use inclusive first and last day of selected month.
- Day keys should be normalized consistently (`YYYY-MM-DD`) across layers.
- Month day count must be computed from selected month, not previous month.

## Known Pitfalls

- Off-by-one month-end calculations can truncate 31-day months.
- Mixed UTC/local date handling can produce weekday drift at timezone boundaries.

## Recommended Future Hardening

- Define one canonical timezone policy for scheduling calculations.
- Centralize month-range utility and reuse across all flows.

## 12. Validation and Error Handling

### UI Validation

- `NurseCard` enforces shift day sum equals `totalDays`.
- Invalid cards show explicit warning.

### API Validation

- Input schemas enforce date and numeric bounds.
- Protected mutations require authenticated context.

### Failure Handling

- Mutations should provide rollback or refetch guarantees.
- Regeneration should report partial-failure diagnostics if persistence fails.

## 13. Security and Access Control

- Web middleware guards protected pages (`/dashboard`, `/manage-users`).
- Sensitive mutations are behind protected tRPC procedures.
- User session context is resolved in API context.

## 14. Performance Characteristics

- Roster table uses virtualization for large nurse lists.
- API uses batch links and batched DB writes for generation.
- Potential hotspots:
  - Full-month delete+reinsert on generation
  - Multi-join read query over broad date ranges
  - Frequent full refresh after preference saves

## 15. Observability Requirements

Minimum instrumentation:

- Generation start/finish/failure with month and row counts.
- Shift update mutation latency and failure rates.
- Preference upodate normalization events (when total > 100).
- Date-range fetch logs with resolved start/end.

## 16. Edge Cases and Known Risks

- 31-day months must include day 31 in both fetch and UI totals.
- Friday logic duplicated across backend/frontend may diverge.
- Null/off assignment representation may be inconsistent in some joins.
- Optimistic UI can temporarily diverge from server truth.
- Percentage rounding can alter exact day-equivalent intent.

## 17. Test Strategy

### Unit Tests

- Month-range and day-count helpers (including leap year and 31-day months).
- Preference conversion and normalization logic.
- Generation constraint logic and fairness checks.

### Integration Tests

- `getSchedules` response shape and metrics consistency.
- `updateShift` upsert semantics.
- `updateNurseShiftPreferences` scaling/normalization behavior.

### E2E Tests

- Dashboard month switch -> verify day columns count.
- Generate roster -> verify visible assignments update.
- Manage-users month switch -> verify card total sync (no stale 30/31).
- Save preferences -> verify post-refresh values persist correctly.

## 18. Rollout and Operational Guidance

- Introduce changes behind feature flags where algorithm/rule semantics change.
- Backfill/migration plan required if preference model evolves.
- Keep explicit changelog for scheduling-rule modifications.

## 19. Open Questions

- Should off-days be explicitly persisted as first-class shift type instead of null?
- Should Friday rule be configurable from DB/config instead of hardcoded?
- Should generation be idempotent by deterministic seed for reproducibility?
- Should manage-users save avoid full page refresh and do targeted cache updates?

## 20. Acceptance Criteria

- Selected month always renders correct day count in all relevant UIs.
- Generating roster for selected month persists assignments for every day.
- Manual shift edit persists correctly and survives refresh.
- Preference updates save correctly and rehydrate consistently.
- Switching month recomputes card totals and removes stale sum mismatches.