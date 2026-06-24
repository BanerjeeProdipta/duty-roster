# Preference equality fix — Remove all target capping, enforce exact equality, fail loud

## Changes to `packages/api/src/roster/solver.py`

### 1. Clean up import (line 4)

```python
# Old:
from typing import Dict, List, Optional, Tuple

# New:
from typing import Dict
```

### 2. Remove `soft_override` param and `max_shifts_per_type` extraction (lines 61, 70)

```python
# Old:
def solve(data, soft_override: Optional[set[str]] = None):

# New:
def solve(data):
```

And remove line 70 (`max_shifts_per_type = data.get("max_shifts_per_type", {})`).

### 3. Remove `assignable_limit` cap in requested_mins (lines 358–366)

```python
# Old:
            assignable_limit: Optional[int] = None
            if isinstance(max_shifts_per_type, dict):
                assignable_limit = max_shifts_per_type.get(n, {}).get(s, None)
            if assignable_limit is None:
                assignable_limit = days
            if assignable_limit < 0:
                continue

            capped_req = min(req_count, assignable_limit)

# New:
            capped_req = req_count
```

### 4. Remove per-nurse total capping block (lines 379–397)

Delete these lines entirely:
```python
        # Ensure per-nurse total targets don't exceed max_feasible.
        ...
                else:
                    break
```

### 5. Remove softening/fallback logic in preference enforcement (lines 403–436)

```python
# Old (lines 403-436):
    # ── Per-nurse exact preference enforcement ────────────────────────────
    # Business logic rule #6: each nurse's count of each shift type MUST
    # EQUAL their preference target.  Enforce exact equality for every
    # (nurse, shift) pair with capped_req > 0.
    # In fallback mode (soft_override), use <= with shortfall penalties
    # instead of == to maintain feasibility.
    SHORTFALL_PENALTY = constraints.get("preference_shortfall_penalty_weight", 1000)
    SURPLUS_PENALTY = constraints.get("preference_surplus_penalty_weight", 50)
    deviation_penalties: list[cp_model.IntVar] = []
    exact_count = 0
    soft_count = 0

    for s in shifts:
        is_softened = soft_override is not None and s in soft_override
        for n, capped_req in requested_mins[s]:
            if is_softened:
                model.Add(shift_count[(n, s)] <= capped_req)
                shortfall = model.NewIntVar(0, days, f"shortfall_{n}_{s}")
                model.Add(shortfall >= capped_req - shift_count[(n, s)])
                model.Add(shortfall >= 0)
                deviation_penalties.append(-SHORTFALL_PENALTY * shortfall)
                surplus = model.NewIntVar(0, days, f"surplus_{n}_{s}")
                model.Add(surplus >= shift_count[(n, s)] - capped_req)
                model.Add(surplus >= 0)
                deviation_penalties.append(-SURPLUS_PENALTY * surplus)
                soft_count += 1
            else:
                model.Add(shift_count[(n, s)] == capped_req)
                exact_count += 1

    print(f"   ✅ {exact_count} exact preference targets", flush=True)
    if soft_count > 0:
        softened_shifts = sorted([s for s in shifts if soft_override and s in soft_override])
        print(f"   ⚠️  {soft_count} soft (fallback) targets for: {softened_shifts}", flush=True)

# New:
    # ── Per-nurse exact preference enforcement ────────────────────────────
    # Business logic rule #6: each nurse's count of each shift type MUST
    # EQUAL their preference target.  Enforce exact equality for every
    # (nurse, shift) pair with capped_req > 0.
    deviation_penalties: list[cp_model.IntVar] = []
    exact_count = 0

    for s in shifts:
        for n, capped_req in requested_mins[s]:
            model.Add(shift_count[(n, s)] == capped_req)
            exact_count += 1

    print(f"   ✅ {exact_count} exact preference targets", flush=True)
```

### 6. Improve INFEASIBLE error message (lines 555–557)

```python
# Old:
        print(f"   ❌ NO FEASIBLE SOLUTION — problem constraints are contradictory", flush=True)
        return {"success": False, "reason": "Solver could not find feasible solution"}

# New:
        print(f"   ❌ NO FEASIBLE SOLUTION — preference targets exceed capacity", flush=True)
        return {
            "success": False,
            "reason": "Preference targets exceed capacity. Check that each nurse's total target shifts don't exceed the maximum feasible per month.",
        }
```

### 7. Replace `__main__` block — remove fallback, add diagnostics (lines 668–701)

```python
# Old:
if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    shifts_list = data.get("shifts", [])
    coverage = data.get("coverage", [])
    days = data.get("days", 30)

    # First attempt: all-hard exact constraints
    result = solve(data)

    # Iterative fallback: on infeasibility, progressively soften the most
    # over-subscribed shift type(s) until a solution is found.
    if not result.get("success") and shifts_list and coverage:
        preferences = data.get("preferences", {})
        nurses_list = data.get("nurses", [])
        total_cov = {s: sum(c[s] for c in coverage) for s in shifts_list}
        total_tgt = {s: 0 for s in shifts_list}
        for n in nurses_list:
            for s in shifts_list:
                pct = preferences.get(n, {}).get(s, 0)
                total_tgt[s] += js_round((pct / 100.0) * days)

        headroom = {s: total_tgt[s] - total_cov[s] for s in shifts_list}
        sorted_shifts = sorted(shifts_list, key=lambda s: headroom.get(s, 0), reverse=True)

        softened: set[str] = set()
        for shift in sorted_shifts:
            if result.get("success"):
                break
            softened.add(shift)
            print(f"\n🔁 [SOLVER] FALLBACK: Retrying with '{shift}' softened "
                  f"(headroom={headroom.get(shift, 0)})", flush=True)
            result = solve(data, soft_override=softened)

    print(json.dumps(result))

# New:
if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    days = data.get("days", 30)
    nurses = data.get("nurses", [])

    result = solve(data)

    # On infeasibility, diagnose which nurses have conflicting constraints.
    if not result.get("success"):
        preferences = data.get("preferences", {})
        min_days_off_per_week = data.get("constraints", {}).get("min_days_off_per_week", 0)
        weeks = days // 7
        mandatory_off = min_days_off_per_week * weeks
        max_feasible = days - mandatory_off

        reasons: list[str] = []
        for n in nurses:
            total_target = 0
            for s in data.get("shifts", []):
                pct = preferences.get(n, {}).get(s, 0)
                total_target += js_round((pct / 100.0) * days)
            if total_target > max_feasible:
                reasons.append(
                    f"nurse '{n}': total target {total_target} > max feasible {max_feasible}"
                )

        if reasons:
            result["reason"] += " | " + "; ".join(reasons)

    print(json.dumps(result))
```
