# Duty Roster Solver

## Overview

The solver is a Python OR-Tools CP-SAT program invoked from `packages/api/src/roster/utils.ts`.
It receives a JSON payload describing nurses, days, shift preferences, coverage requirements,
and scheduling constraints. The solver builds a constraint programming model, finds a feasible
solution, and returns a day-by-day roster matrix.

## Input payload

The solver accepts the following fields:

- `nurses`: list of active nurse IDs.
- `days`: number of days in the month.
- `shifts`: `["morning", "evening", "night"]`.
- `preferences`: map from nurse ID to shift weights (0–100).
- `max_shifts_per_type`: map from nurse ID to per-shift **adjusted** hard limits — these are
  computed as `Math.round(weight/100 × days)` with the per-nurse total capped to `days - 5`
  (mirroring the roster table display). The solver uses these as exact equality targets.
- `coverage`: array of daily **minimum** coverage objects, one per day.
- `constraints`: solver rules such as `max_consecutive_nights`, `max_consecutive_days`, and
  `min_days_off_per_week`.
- `unavailable`: optional nurses/days that must not be assigned.
- `previous_shifts`: optional previous-month night history for continuity rules.

## Adjustment logic (TypeScript side)

Before the payload reaches the Python solver, the service applies an adjustment to the
preference targets so every nurse's total target equals `days - 5`:

1. Raw targets: `Math.round(weight/100 × days)` for each shift type.
2. Evening and night are kept as-is (or scaled down proportionally if their sum exceeds
   `days - 5`).
3. Morning absorbs the remainder: `adjMorning = max(0, days - 5 - adjEvening - adjNight)`.

This ensures the solver enforces the same targets that the roster table displays.

## Model variables

The solver creates boolean variables:

- `X[nurse, day, shift]` = 1 if the nurse works that shift on that day.

There are `|nurses| × days × 3` boolean decision variables.

Derived integer variables track per-nurse shift counts and total working days.

## Hard constraints

1. **One shift per nurse per day**: `sum(X[n, d, s] for s) ≤ 1`.
2. **Minimum coverage**: `sum(X[n, d, s] for n) ≥ coverage[d][s]` — overstaffing is allowed.
3. **Night rest and cooldown**:
   - No more than 2 consecutive night shifts.
   - Two prior nights in the previous month can force the first day of the new month off.
   - A night followed by any shift the next day is blocked when required.
4. **Unavailable nurses** on blocked days are forced to 0.
5. **Max consecutive working days**: a nurse cannot work more than 6 consecutive days.
6. **Shift-type limits**: per-nurse shift counts are bounded by `max_shifts_per_type` values
   (which match the exact equality targets).
7. **Exact preference equality**: for every (nurse, shift) with a positive adjusted target,
   `shift_count[n, s] == target` — this is the central rule (Rule #6 in business logic).

## Soft optimization

The objective maximises preference satisfaction while promoting fairness:

- **Preference reward**: each assigned shift contributes its preference weight (raw, not
  adjusted) to the objective. Higher weight = stronger incentive to assign.
- **Workload balancing**: each nurse is penalised `-100 × deviation` from the average load.
- **Night-pair reward**: consecutive night shifts receive `+50` each (encourages NNO patterns).
- **Zero-preference penalty**: assigning a nurse to a 0‑weight shift type incurs `-10000` per
  assignment (strong discouragement, not a hard block).
- **Deviation penalties (fallback only)**: when a shift type is softened, under-assignment
  against target costs `-100000` per missing shift, and over-assignment costs `-10000`.

## Solve ordering & flexibility analysis

Before building the model, the solver analyses which shift type is least flexible:

- For each shift type it computes `required / assignable` ratio.
- Shift types with higher ratios are tighter (less buffer).
- The solve order processes least flexible first. The fallback mechanism softens shift types
  in reverse order (most flexible first) when the exact model is infeasible.

## Fallback mechanism

If the all-exact model is infeasible (e.g., total targets exceed what's schedulable given
the hard constraints), the solver iteratively relaxes constraint types:

1. Start with all shift types enforced as exact equalities.
2. If infeasible, **soften** the most flexible shift type (morning) — replace exact equality
   with a heavily penalised deviation variable.
3. Re-solve. If still infeasible, soften the next shift type.
4. Continue until a feasible solution is found. As a last resort, all shift types are softened.

When a shift type is softened:
- `shortfall` and `surplus` integer variables allow the solver to deviate from the target.
- Under-assignment is penalised at `-100000` per shift (very expensive).
- Over-assignment is penalised at `-10000` per shift.

## Solver settings

- The solver uses `CpSolver()` from OR-Tools.
- Search time and worker count are tuned based on available assignment buffer:
  - Large buffer (>10): 8 workers, 30s timeout.
  - Moderate buffer (0–10): 4 workers, 45s timeout.
  - Tight (<=0): 4 workers, 60s timeout.
- If the solver finds only a FEASIBLE (not proven OPTIMAL) solution, the roster is still
  accepted — it meets all hard constraints and preference targets.

## Output

The solver returns a JSON object containing:

- `success`: boolean
- `roster`: map from nurse ID to daily shift list (one entry per day)
- `workload`: assigned shift counts per nurse
- `shift_totals`: total assigned shifts by type
- `required`: required shift counts by type
- `preference_score`: achieved preference sum
- `max_preference_score`: maximum possible preference sum
- `preference_deviations`: list of nurse/shift pairs where exact equality was violated
  (only present when the fallback softened some shift types)
- `softened_shifts`: shift types that were relaxed during fallback (if any)
- Debug metrics: `solve_order`, `flexibility_metrics`

## Execution path

- `packages/api/src/roster/service.ts` assembles the payload (with adjusted targets).
- `packages/api/src/roster/utils.ts` calls `runSolver()`.
- `packages/api/src/roster/solver.py` builds the CP model and prints JSON.
- `runSolver()` parses the final JSON line from Python stdout.

## Key changes (June 2026)

- **Friday caps removed** — the solver no longer constrains Friday morning to exactly 3;
  overstaffing on Fridays is allowed to meet preference targets.
- **Capacity scaling removed** — the solver no longer scales raw preference targets down
  to fit within coverage minimums. Targets are used as-is (after the `days - 5` adjustment).
- **Targets come from TypeScript** — adjusted `max_shifts_per_type` values are used as exact
  equality targets, ensuring the solver and display agree on what each nurse should get.
- **Fallback for infeasibility** — if the all-exact model cannot be solved, the solver
  progressively softens shift types to produce a feasible roster.
