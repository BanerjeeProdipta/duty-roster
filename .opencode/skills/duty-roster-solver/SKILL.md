---
name: duty-roster-solver
description: CP-SAT roster solver operations for the Duty Roster project. Use when modifying solver constraints, tuning ROSTER_CONFIG, debugging schedule generation, or editing solver.py. Filenames: packages/api/src/roster/solver.py, packages/api/src/roster/utils.ts, packages/api/src/roster/service.ts.
---

# duty-roster-solver

The roster solver uses Google OR-Tools CP-SAT (Python) to generate optimal nurse schedules. Called from TypeScript as a child process.

## Architecture

```
service.ts  →  utils.runSolver(payload)  →  spawns python3 solver.py  →  JSON stdout →  service.ts
```

The payload is a JSON object with nurses, shifts, preferences, and coverage requirements. The solver returns a JSON schedule.

## solver.py

Location: `packages/api/src/roster/solver.py`

Structure:
- **Variables**: `shifts[nurse][day]` — integer variable per nurse-day (0=off, 1=morning, 2=evening, 3=night)
- **Hard constraints**: Night shift limits, consecutive night limits, max consecutive days, min days off per week, Friday off for specified nurses, coverage requirements per day-type
- **Objective**: Maximize preference satisfaction + fairness

### Key constraint tuning

```python
MAX_CONSECUTIVE_NIGHTS = 2
MAX_CONSECUTIVE_DAYS = 6
MIN_DAYS_OFF_PER_WEEK = 1
```

These are duplicated in both `solver.py` and TypeScript's `ROSTER_CONFIG.CONSTRAINTS`. Keep them in sync.

## ROSTER_CONFIG (utils.ts)

```typescript
export const ROSTER_CONFIG = {
  COVERAGE: {
    WEEKDAY: { morning: 20, evening: 3, night: 2 },
    FRIDAY:  { morning: 3,  evening: 3, night: 2 },
  },
  CONSTRAINTS: {
    MAX_CONSECUTIVE_NIGHTS: 2,
    MAX_CONSECUTIVE_DAYS: 6,
    MIN_DAYS_OFF_PER_WEEK: 1,
    NIGHT_CONSTRAIN: 2,
  },
} as const;
```

### Coverage tiers

- `COVERAGE.WEEKDAY` — Mon–Thu and Sat–Sun
- `COVERAGE.FRIDAY` — Special reduced coverage for Fridays

The function `getCoverageForDay(dayIndex, monthStartDate)` selects the right coverage tier based on whether the day is a Friday.

### Nurse eligibility

`getEligibleNurses(nurseId, dayIndex, ...)` considers:
- Nurse active status
- Max consecutive nights
- Max consecutive working days
- Min days off per week

## Key utility functions (utils.ts)

| Function | Purpose |
|---|---|
| `formatDateKey(year, month, day)` | `YYYY-MM-DD` format |
| `getMonthDateRange(year, month)` | Start/end Date objects |
| `getDaysInMonth(year, month)` | Number of days |
| `isFriday(year, month, day)` | Day-of-week check |
| `getCoverageForDay(dayIndex, monthStartDate)` | Coverage requirements |
| `getShiftRequirementsForMonth(...)` | Total shift counts per type |
| `buildCoverageForMonth(...)` | Prepares the coverage map |
| `calculateFairShares(...)` | Fair distribution of night shifts |
| `runSolver(payload)` | Spawns Python solver process |

## runSolver(payload)

Parses JSON from solver.py stdout. Expected output format:

```json
{
  "status": "OPTIMAL" | "FEASIBLE" | "INFEASIBLE",
  "schedule": { "nurseId": { "dayIndex": shiftType } }
}
```

### Debugging infeasibility

If the solver returns `INFEASIBLE`:
1. Check coverage requirements against available nurses — especially Friday coverage
2. Reduce `MAX_CONSECUTIVE_NIGHTS` or increase `MAX_CONSECUTIVE_DAYS`
3. Ensure `NIGHT_CONSTRAIN` is ≥ 1
4. Check that the number of active nurses can cover total shift requirements
5. Try running solver.py directly with the payload for detailed OR-Tools error output

## Testing

Solver tests are in `packages/api/src/roster/utils.test.ts`. Run with `cd packages/api && bun run test`.
