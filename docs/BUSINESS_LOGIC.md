# Duty Roster Business Logic

## Purpose

Generate monthly nurse shift rosters that satisfy coverage requirements, workload balance, and rest/safety constraints while honoring nurse shift preferences.

## Core entities

- **Nurse**: A staff member who may be active or inactive for scheduling.
- **Shift**: One of `morning`, `evening`, `night`, or `off`.
- **NurseSchedule**: A daily assignment record mapping a nurse to a date and shift.
- **NurseShiftPreference**: A weight for each shift type that guides the solver.

## Coverage rules

The roster uses the following daily staffing targets:

- Weekday: `morning = 20`, `evening = 3`, `night = 2`
- Friday: `morning = 3`, `evening = 3`, `night = 2`

Coverage is built per day in `packages/api/src/roster/utils.ts` using `buildCoverageForMonth()`.

## Hard constraints

1. Each nurse can work at most one shift per day.
2. Exact daily coverage must be met for every shift type.
3. No nurse may work more than 2 consecutive night shifts.
4. After 2 nights, the next day must be off (Night-Night-Off behavior).
5. Specific nurses may be blocked from working on Fridays.
6. Each nurse is limited to a maximum count of each shift type based on preference weights.
7. Night assignments are constrained by previous-month history for continuity.

## Soft optimization goals

1. Maximize satisfaction of nurse shift preferences.
2. Balance workload across available nurses.
3. Reward consecutive night pairs when they preserve the required rest pattern.

## Preference handling

- Preferences are stored as weights in the database and loaded in `packages/api/src/roster/service.ts`.
- Shift weights are expressed as percentages and converted into hard caps for the month.
- A nurse with `shift_off` weight is effectively treated as preferring days off when all other shift weights are lower.

## Solver flow

1. `packages/api/src/roster/service.ts` builds a solver payload from current preferences, coverage, constraints, and prior-month night history.
2. `packages/api/src/roster/utils.ts` calls `runSolver()`, which spawns the Python solver at `packages/api/src/roster/solver.py`.
3. The Python solver constructs a CP-SAT model, solves for the best assignment, and returns a roster matrix.
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
- The solver uses exact coverage constraints rather than soft coverage, so the input must be feasible.
- Friday coverage and nurse restrictions are handled explicitly through `FRIDAY_OFF_NURSES` and `getFridayIndicesForMonth()`.
