# Duty Roster Business Logic

## Purpose

Generate monthly nurse shift rosters that satisfy coverage requirements, workload balance, and rest/safety constraints while honoring nurse shift preferences.

## Core entities

- **Nurse**: A staff member who may be active or inactive for scheduling.
- **Shift**: One of `morning`, `evening`, `night`, or `off`.
- **NurseSchedule**: A daily assignment record mapping a nurse to a date and shift.
- **NurseShiftPreference**: A weight for each shift type that guides the solver.

## Coverage rules

The roster uses the following minimum daily staffing targets:

- Weekday: `morning = 23`, `evening = 3`, `night = 2`
- Friday: `morning = 3`, `evening = 3`, `night = 2`

Coverage is built per day in `packages/api/src/roster/utils.ts` using `buildCoverageForMonth()`.
These are **minimum** requirements — the solver may assign more than the minimum on any day
(including Fridays) to meet preference targets.

## Hard constraints

1. Each nurse can work at most one shift per day.
2. Minimum daily coverage must be met for every shift type.
3. No nurse may work more than 2 consecutive night shifts.
4. After 2 nights, the next day must be off (Night-Night-Off behavior).
5. Specific nurses may be blocked from working on Fridays.
6. Each nurse's count of each shift type must equal their **adjusted preference target**.
7. Night assignments are constrained by previous-month history for continuity.
8. No nurse may exceed `days - ceil(days/7)` total working days (max-consecutive-days constraint).

## Preference handling

### Raw weights

Preferences are stored as weights (0–100) in the database. These represent the relative
desirability of each shift type for a nurse. Higher weight = more preference.

### Target computation & adjustment

The raw target for each shift type is `Math.round(weight / 100 × days)`. However, the
displayed preference target in the roster table is **adjusted** to ensure every nurse's
total preference sum equals `days - 5` (e.g. 25 for a 30-day month). This forces exactly
5 off‑days per nurse in the ideal target:

1. Compute `rawMorning`, `rawEvening`, `rawNight` via `Math.round(weight/100 × days)`.
2. Keep evening and night raw values as‑is (or scale them down proportionally if their
   sum exceeds `days - 5`).
3. Set adjusted morning to `max(0, days - 5 - adjEvening - adjNight)` (absorbs the remainder).

This adjustment runs in two places — the solver payload builder (`service.ts`) and the
roster display endpoint — ensuring they agree on the target values.

### Exact enforcement

The solver enforces exact equality for every (nurse, shift) pair with a positive adjusted
target. Zero-weight shift types are not targeted but can still be assigned as a last resort
(penalised heavily in the objective).

## Soft optimization goals

1. Maximise preference satisfaction (each assigned shift contributes its weight to the objective).
2. Balance workload across available nurses (penalise deviation from average load).
3. Reward consecutive night pairs when they preserve the required rest pattern.

## Fallback mechanism

If the all-exact model is infeasible, the solver iteratively **softens** shift types from
most flexible to least flexible (reverse of the `solve_order`). For softened shift types,
exact equality is replaced with a heavily penalised deviation variable, allowing the solver
to find a feasible solution even when exact targets cannot all be met simultaneously.

## Solver flow

1. `packages/api/src/roster/service.ts` builds a solver payload from current preferences,
   coverage, constraints, and prior-month night history. Preference targets are adjusted
   to `days - 5` total.
2. `packages/api/src/roster/utils.ts` calls `runSolver()`, which spawns the Python solver
   at `packages/api/src/roster/solver.py`.
3. The Python solver constructs a CP-SAT model, solves for the best assignment, and returns
   a roster matrix.
4. The backend deletes any existing month schedules and bulk inserts the new roster.
5. The UI refreshes from the database and shows generated assignments.

## Where implementation lives

- Solver payload builder: `packages/api/src/roster/service.ts`
- Coverage and preference helpers: `packages/api/src/roster/utils.ts`
- Python solver: `packages/api/src/roster/solver.py`
- Solver runner: `packages/api/src/roster/utils.ts` (`runSolver()`)
- Shift update mutation: `packages/api/src/roster/router.ts`

## Notes

- The system currently relies on a separate Python process for OR-Tools.
- The solver uses minimum coverage constraints rather than exact coverage, so overstaffing
  is allowed (including on Fridays).
- Friday coverage and nurse restrictions are handled explicitly through `FRIDAY_OFF_NURSES`
  and `getFridayIndicesForMonth()`.
- If the solver cannot meet all exact preference targets, it falls back to a softened model
  that permits deviations with heavy penalties, guaranteeing a feasible roster.
