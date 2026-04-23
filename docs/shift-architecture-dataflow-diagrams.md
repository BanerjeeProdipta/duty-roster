# Shift Architecture Dataflow Diagrams

## Purpose

This document provides visual architecture and component-level dataflow diagrams for shift scheduling in the Duty Roster app. It complements the detailed PRD with flow-oriented views for faster system understanding.

## 1) High-Level System Architecture

```mermaid
flowchart LR
  U[Admin/Scheduler]
  W[Next.js Web App<br/>apps/web]
  Q[React Query Cache]
  Z[Zustand Roster Store]
  A[tRPC API Router<br/>packages/api]
  S[Roster Service Layer<br/>service.ts]
  D[DB Access Layer<br/>db.ts]
  P[(Postgres<br/>packages/db schema)]

  U --> W
  W <--> Q
  W <--> Z
  W --> A
  A --> S
  S --> D
  D --> P
  P --> D
  D --> S
  S --> A
  A --> W
```

## 2) Component Architecture (Dashboard + Manage Users)

```mermaid
flowchart TD
  subgraph DashboardRoute["Dashboard Route"]
    DP[app/dashboard/page.tsx]
    RT[RosterTable.tsx]
    RH[RosterHeader.tsx]
    NR[NurseRow.tsx]
    SD[ShiftDropdown.tsx]
    DC[DayHeaderCell.tsx]
  end

  subgraph SharedHooks["Shared Hooks / State"]
    SSI[useScheduleInit.ts]
    US[useSchedules.ts]
    URD[useRosterDates.ts]
    UGS[useGetShifts.ts]
    UGR[useGenerateRoster.ts]
    UUS[useUpdateShift.ts]
    ZS[useRosterStore.ts]
  end

  subgraph ManageUsers["Manage Users Route"]
    MP[app/manage-users/page.tsx]
    SAC[ShiftAllocationsClient.tsx]
    USA[useShiftAllocations.ts]
    NC[NurseCard.tsx]
    UNC[useNurseCard.ts]
    UUP[useUpdatePreferences.ts]
  end

  subgraph API["API + Service + DB"]
    RR[roster/router.ts]
    RSV[roster/service.ts]
    RDB[roster/db.ts]
  end

  DP --> SSI
  SSI --> US
  SSI --> ZS
  RT --> URD
  RT --> UGS
  RT --> ZS
  RH --> UGR
  SD --> UUS
  RT --> NR
  RT --> DC

  MP --> SAC
  SAC --> SSI
  SAC --> USA
  SAC --> NC
  NC --> UNC
  UNC --> UUP

  US --> RR
  UGR --> RR
  UUS --> RR
  UUP --> RR
  RR --> RSV --> RDB
```

## 3) Dashboard Read Flow (Month Load -> Roster Render)

```mermaid
sequenceDiagram
  participant User
  participant DashboardPage as dashboard/page.tsx
  participant TRPCServer as trpc-server caller
  participant Router as roster.getSchedules
  participant Service as roster/service.ts
  participant DB as roster/db.ts
  participant Client as RosterTable + useScheduleInit
  participant Store as Zustand + React Query

  User->>DashboardPage: Open /dashboard?year=Y&month=M
  DashboardPage->>TRPCServer: getSchedules(startDate,endDate)
  TRPCServer->>Router: tRPC call
  Router->>Service: validate + delegate
  Service->>DB: findSchedulesAndPreferencesByDateRange
  DB-->>Service: raw rows
  Service-->>Router: shaped nurseRows + dailyShiftCounts
  Router-->>DashboardPage: SchedulesResponse
  DashboardPage-->>Client: initialSchedules prop
  Client->>Store: hydrate query/store (useScheduleInit)
  Store-->>Client: nurseRows + metrics
  Client-->>User: Render roster grid for full month
```

## 4) Generate Roster Flow

```mermaid
sequenceDiagram
  participant User
  participant Header as RosterHeader.tsx
  participant Hook as useGenerateRoster.ts
  participant Router as roster.generateRoster
  participant Service as generateRoster()
  participant DB as createSchedules()
  participant UI as Dashboard UI

  User->>Header: Click Generate
  Header->>Hook: mutate(year,month)
  Hook->>Router: generateRoster request
  Router->>Service: build schedule with constraints
  Service->>DB: delete month schedules + batch insert
  DB-->>Service: persist result
  Service-->>Router: generation summary
  Router-->>Hook: success response
  Hook-->>UI: invalidate/refetch schedules
  UI-->>User: Updated month roster visible
```

## 5) Manual Shift Update Flow (Cell Edit)

```mermaid
sequenceDiagram
  participant User
  participant Cell as ShiftDropdown.tsx
  participant Hook as useUpdateShift.ts
  participant Cache as React Query + Zustand
  participant Router as roster.updateShift
  participant Service as upsertSchedule()
  participant DB as createSchedule/updateScheduleShift

  User->>Cell: Select new shift
  Cell->>Hook: updateShift(nurseId,date,shiftId)
  Hook->>Cache: optimistic local update
  Hook->>Router: mutation call
  Router->>Service: validate + upsert logic
  Service->>DB: insert/update assignment row
  DB-->>Service: persisted row
  Service-->>Router: success
  Router-->>Hook: mutation success
  Hook-->>Cache: keep/confirm optimistic value
```

## 6) Manage Users Preference Update Flow

```mermaid
sequenceDiagram
  participant User
  participant ManagePage as manage-users/page.tsx
  participant Client as ShiftAllocationsClient.tsx
  participant Map as useShiftAllocations.ts
  participant Card as NurseCard + useNurseCard
  participant PrefHook as useUpdatePreferences.ts
  participant Router as roster.updateNurseShiftPreferences
  participant Service as updateNurseShiftPreferenceWeights()
  participant DB as upsertNurseShiftPreferences()

  User->>ManagePage: Open /manage-users?year=Y&month=M
  ManagePage->>Client: initialSchedules
  Client->>Map: derive nurse cards + totalDays
  Map-->>Client: nurses[]
  User->>Card: Edit day allocations / active flag
  Card->>Card: validate sum == totalDays
  User->>Card: Save
  Card->>PrefHook: convert days -> percentage payload
  PrefHook->>Router: update preferences
  Router->>Service: group + normalize if needed
  Service->>DB: upsert (nurse,shift) weights
  DB-->>Service: success
  Service-->>Router: success
  Router-->>PrefHook: success
  PrefHook-->>Client: refresh/refetch
```

## 7) Month Change and 31-Day Synchronization Flow

```mermaid
flowchart TD
  A[MonthNavigator changes URL year/month] --> B[useSchedules computes totalDays from selected month]
  B --> C[getSchedules called with full month range]
  C --> D[SchedulesResponse rehydrated]
  D --> E[useShiftAllocations remaps nurse cards]
  E --> F[useNurseCard useEffect syncs draft from nurse + totalDays]
  F --> G[NurseCard sum/off recomputed]
  G --> H[UI shows correct X/31 totals and validation state]
```

## 8) State Ownership Diagram

```mermaid
flowchart LR
  subgraph LocalComponentState
    LCD[NurseCard draft state<br/>editable buffer]
  end

  subgraph GlobalClientState
    RQ[React Query<br/>server cache]
    ZS[Zustand roster store<br/>UI-friendly matrix]
  end

  subgraph RemoteState
    API[tRPC procedures]
    DB[(Postgres tables)]
  end

  LCD -->|save action| API
  API --> DB
  DB --> API
  API --> RQ
  RQ <--> ZS
  ZS --> LCD
```

## 9) Data Contract Transformation Diagram

```mermaid
flowchart TD
  A[DB Rows<br/>schedules + preferences + nurses] --> B[service.ts shaping]
  B --> C[SchedulesResponse]
  C --> D[useScheduleInit]
  D --> E[RosterTable view model]
  C --> F[useShiftAllocations]
  F --> G[NurseCard day-count model]
  G --> H[convertToPreferences]
  H --> I[PreferenceUpdate payload %]
  I --> J[updateNurseShiftPreferences]
  J --> K[Backend normalize/upsert]
```

## 10) Failure and Recovery Paths

```mermaid
flowchart TD
  A[User action: update shift / preferences] --> B[Optimistic UI update]
  B --> C{API success?}
  C -- Yes --> D[Keep local state + refetch as needed]
  C -- No --> E[Rollback/invalidate cache]
  E --> F[Refetch authoritative server state]
  F --> G[UI consistency restored]
```

## 11) Diagram Reading Notes

- Dashboard and manage-users both consume the same schedules backend response.
- Manual shift edits and preference updates are separate mutation pipelines.
- Month boundaries and `totalDays` influence both display columns and card validation.
- `useNurseCard` draft sync on month change is critical to prevent stale totals (for example `30/31` mismatch).

## 12) Feature-Wise Data Flow (Step by Step)

This section is organized by feature in the exact execution order: initial API call -> cache/store -> UI render -> optimistic updates -> count recomputation.

### 12.1 Feature: Initial Schedule Load

```mermaid
sequenceDiagram
  participant User
  participant Page as dashboard/page.tsx or manage-users/page.tsx
  participant Utils as getMonthDateRange()
  participant ServerCaller as getAuthedTRPCServer()
  participant API as roster.getSchedules
  participant ClientHook as useScheduleInit/useSchedules
  participant Query as React Query cache
  participant Store as Zustand roster store
  participant UI as RosterTable or ShiftAllocationsClient

  User->>Page: Open month route (year, month)
  Page->>Utils: Resolve startDate/endDate
  Page->>ServerCaller: Create server caller
  ServerCaller->>API: getSchedules(startDate,endDate)
  API-->>Page: initialSchedules
  Page-->>UI: Pass initialSchedules props
  UI->>ClientHook: Initialize data layer
  ClientHook->>Query: Seed and manage schedules query
  ClientHook->>Store: setInitialSchedules for local matrix use
  Query-->>UI: canonical server response
  Store-->>UI: local roster-friendly view state
```

What this means in app behavior:

- Every month view starts from a server call scoped to selected month dates.
- `initialSchedules` removes first-paint blank state.
- React Query remains canonical cache; Zustand supports UI-specific fast reads/optimistic mutations.

### 12.2 Feature: Storage and Cache Ownership

```mermaid
flowchart LR
  APIResp[SchedulesResponse] --> RQ[React Query]
  APIResp --> ZS[Zustand useRosterStore]
  RQ --> RT[RosterTable]
  RQ --> SA[ShiftAllocationsClient]
  ZS --> RT
  ZS --> Metrics[dailyShiftCounts / nurseRows derived usage]
  SA --> NC[NurseCard local draft]
```

Ownership rules:

- **React Query:** source of truth for fetched server data lifecycle.
- **Zustand:** performant mutable matrix state for roster interactions.
- **NurseCard local state:** edit buffer only; must re-sync from props on month/data change.

### 12.3 Feature: Optimistic Update (Dashboard Shift Cell)

```mermaid
sequenceDiagram
  participant User
  participant Cell as ShiftDropdown
  participant Hook as useUpdateShift
  participant Query as React Query
  participant Store as Zustand
  participant API as roster.updateShift
  participant DB as nurse_schedule

  User->>Cell: Change shift for a date
  Cell->>Hook: mutate(payload)
  Hook->>Query: optimistic patch nurse assignment
  Hook->>Store: optimistic patch roster matrix/count inputs
  Hook->>API: persist mutation
  API->>DB: upsert schedule row
  DB-->>API: success/failure
  API-->>Hook: result
  Hook-->>Query: confirm or invalidate/refetch
  Hook-->>Store: keep or rollback from authoritative data
```

How optimistic updates work here:

- User sees immediate cell update before API roundtrip.
- If API succeeds, optimistic value is retained.
- If API fails, app refetches/invalidates to restore server truth.

### 12.4 Feature: How Counts Update on Dashboard

```mermaid
flowchart TD
  A[SchedulesResponse or optimistic mutation] --> B[nurseRows assignments change]
  B --> C[Store/query state updated]
  C --> D[useShiftCountMetrics + dailyShiftCounts reads]
  D --> E[DayHeaderCell rerender]
  D --> F[NurseIdentityCell assigned metrics rerender]
  E --> G[Header counts reflect latest assignment state]
  F --> H[Per nurse counts reflect latest assignment state]
```

Count update behavior:

- Day-level counts are driven by assignment state keyed by date.
- Nurse-level assigned metrics update from changed assignment map.
- Header and row count UI both rerender from same updated state graph.

### 12.5 Feature: Manage Users Shift Count Model

```mermaid
sequenceDiagram
  participant Resp as SchedulesResponse
  participant Map as useShiftAllocations
  participant Card as NurseCard/useNurseCard
  participant Save as useUpdatePreferences
  participant API as updateNurseShiftPreferences
  participant Refresh as router.refresh + refetch

  Resp->>Map: preferenceWiseShiftMetrics -> nurse day-counts
  Map-->>Card: nurse {morning, evening, night, off}, totalDays
  Card->>Card: sum validation (sum == totalDays)
  Card->>Save: convert day-counts -> percentage payload
  Save->>API: mutate preferences + daysInMonth
  API-->>Save: success
  Save->>Refresh: trigger data refresh
  Refresh-->>Map: recompute nurse cards from fresh response
```

How shift counts work in manage-users:

- Manage-users cards are based on **preference-wise** metrics, not per-day assigned schedule cells.
- `off` is derived from `totalDays - (morning + evening + night)`.
- Validation is strict per selected month, so 31-day months require sums of 31.
- On month switch, `useNurseCard` must re-sync draft to avoid stale totals.

### 12.6 Feature: Month Change End-to-End (Why 30/31 Happens)

```mermaid
flowchart TD
  A[URL month changes] --> B[useSchedules recalculates totalDays]
  B --> C[getSchedules for new month range]
  C --> D[useShiftAllocations remaps nurse values]
  D --> E[useNurseCard sync effect updates draft and off]
  E --> F[sum recomputed against new totalDays]
  F --> G[validation badge/warning updates]
```

Critical implementation notes:

- If any layer still uses stale month length, cards show mismatch like `30/31`.
- Correct behavior requires both:
  - Correct month-end API range (includes day 31)
  - Draft state sync when `totalDays` changes
