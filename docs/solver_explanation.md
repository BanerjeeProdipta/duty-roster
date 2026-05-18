# Duty Roster Solver

## Overview

The solver is a Python OR-Tools CP-SAT program invoked from `packages/api/src/roster/utils.ts`.
It receives a JSON payload describing nurses, days, shift preferences, coverage requirements, and scheduling constraints.

## Input payload

The solver accepts the following fields:

- `nurses`: list of active nurse IDs.
- `days`: number of days in the month.
- `shifts`: ["morning", "evening", "night"].
- `preferences`: map from nurse ID to shift weights.
- `max_shifts_per_type`: map from nurse ID to per-shift hard limits.
- `coverage`: array of daily coverage objects, one per day.
- `constraints`: solver rules such as `max_consecutive_nights`, `max_consecutive_days`, and `min_days_off_per_week`.
- `unavailable`: optional nurses/days that must not be assigned.
- `previous_shifts`: optional previous-month night history for continuity rules.

## Model variables

The solver creates boolean variables:

- `X[nurse, day, shift]` = 1 if the nurse works that shift on that day.

There are `|nurses| × days × 3` boolean decision variables.

## Hard constraints

1. One shift per nurse per day: `sum(X[n, d, s] for s) ≤ 1`.
2. Exact coverage for every day and shift: `sum(X[n, d, s] for n) == coverage[d][s]`.
3. Night rest and cooldown:
   - No more than 2 consecutive night shifts.
   - Two prior nights in the previous month can force the first day of the new month off.
   - A night followed by any shift the next day is blocked when required.
4. Unavailable nurses on blocked days are forced to 0.
5. Nurse-specific shift limits are enforced as hard caps:
   - negative limit means the shift type is blocked entirely.
   - otherwise `shift_count[n, s] ≤ max_shifts_per_type[n][s]`.

## Soft optimization

The objective maximizes preference satisfaction while promoting fairness:

- Preference reward: each assigned shift contributes its preference weight.
- Workload balancing: each nurse is penalized for deviation from average workload.
- Night-pair reward: consecutive night shifts are given a small positive reward.

## Solver settings

- The solver uses `CpSolver()` from OR-Tools.
- Search time and worker count are tuned based on available assignment buffer.
- If the problem is tight, the solver runs longer with fewer workers.

## Output

The solver returns a JSON object containing:

- `success`: boolean
- `roster`: map from nurse ID to daily shift list
- `workload`: assigned shift counts per nurse
- `shift_totals`: total assigned shifts by type
- `required`: required shift counts by type
- `preference_score`: achieved preference sum
- `max_preference_score`: maximum possible preference sum
- debug metrics such as `solve_order` and `flexibility_metrics`

## Execution path

- `packages/api/src/roster/service.ts` assembles the payload.
- `packages/api/src/roster/utils.ts` calls `runSolver()`.
- `packages/api/src/roster/solver.py` builds the CP model and prints JSON.
- `runSolver()` parses the final JSON line from Python stdout.
