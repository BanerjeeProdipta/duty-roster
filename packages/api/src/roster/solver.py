import json
import sys
from ortools.sat.python import cp_model
from typing import Dict, List, Tuple


def analyze_flexibility(data) -> Dict:
    """
    Calculate flexibility metrics for each shift to determine solve order.
    Returns shifts ordered by req/assignable ratio (least flexible first).
    """
    nurses = data["nurses"]
    days = data["days"]
    shifts = data["shifts"]
    coverage = data["coverage"]
    max_shifts_per_type = data.get("max_shifts_per_type", {})
    unavailable = data.get("unavailable", {})
    unavailable_nurses = set(unavailable.get("nurses", []) if unavailable else [])
    
    metrics = {}
    
    for s in shifts:
        required = sum(coverage[d][s] for d in range(days))
        assignable = sum(
            max(0, max_shifts_per_type.get(n, {}).get(s, days))
            for n in nurses
            if n not in unavailable_nurses
        )
        preference = assignable  # Current preference target
        
        ratio = required / assignable if assignable > 0 else float('inf')
        
        metrics[s] = {
            "required": required,
            "assignable": assignable,
            "preference": preference,
            "ratio": ratio,
            "buffer": assignable - required,
        }
    
    # Sort by ratio descending: tightest (least buffer) first, most flexible last
    # Morning with buffer solved later; tight shifts solved first
    sorted_shifts = sorted(metrics.items(), key=lambda x: x[1]["ratio"], reverse=True)
    
    return {
        "metrics": {k: v for k, v in metrics.items()},
        "solve_order": [s for s, _ in sorted_shifts],
        "sorted_shifts": sorted_shifts,
    }


def solve(data):
    print("🔧 [SOLVER] Starting improved constraint-ordered solver...", flush=True)
    
    nurses = data["nurses"]
    days = data["days"]
    shifts = data["shifts"]
    preferences = data["preferences"]
    coverage = data["coverage"]
    constraints = data["constraints"]
    max_shifts_per_type = data.get("max_shifts_per_type", {})
    
    print(f"📊 [SOLVER] Input: {len(nurses)} nurses, {days} days, {len(shifts)} shift types", flush=True)
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 1: Analyze flexibility and determine solve order
    # ════════════════════════════════════════════════════════════════════
    print("\n📋 [SOLVER] ANALYSIS PHASE: Calculating flexibility metrics...", flush=True)
    
    flexibility = analyze_flexibility(data)
    metrics = flexibility["metrics"]
    solve_order = flexibility["solve_order"]
    
    print(f"   Shift Flexibility Analysis (req/assignable ratio):", flush=True)
    for s, m in flexibility["sorted_shifts"]:
        ratio_str = f"{m['ratio']:.3f}" if m['ratio'] != float('inf') else "∞"
        print(f"      {s.upper():7s}: req={m['required']:3d}, pref={m['preference']:3d}, "
              f"assign={m['assignable']:3d}, buffer={m['buffer']:+3d}, ratio={ratio_str}", flush=True)
    
    print(f"\n   🔄 Solve Order (least flexible → most flexible): {solve_order}", flush=True)
    
    # Detect infeasibility early
    infeasible_shifts = []
    for s in shifts:
        m = metrics[s]
        if m["assignable"] < m["required"]:
            infeasible_shifts.append((s, m["required"], m["assignable"]))
    
    if infeasible_shifts:
        print(f"\n   ⚠️  CRITICAL: These shifts CANNOT meet required coverage:", flush=True)
        for s, req, assign in infeasible_shifts:
            print(f"      {s.upper()}: {req} required > {assign} assignable (DEFICIT: {req - assign})", flush=True)
        return {
            "success": False,
            "reason": "Insufficient capacity for required coverage",
            "infeasible_shifts": infeasible_shifts,
        }
    
    # Cap preferences to assignable capacity
    print(f"\n   📌 Capping preference targets to assignable capacity...", flush=True)
    capped_preferences = {}
    for s in shifts:
        m = metrics[s]
        capped = min(m["preference"], m["assignable"])
        if capped < m["preference"]:
            print(f"      {s.upper()}: {m['preference']} → {capped} "
                  f"(assignable={m['assignable']})", flush=True)
        capped_preferences[s] = capped
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 2: Pre-solve validation
    # ════════════════════════════════════════════════════════════════════
    print(f"\n🔍 [SOLVER] VALIDATION PHASE: Pre-solve feasibility check...", flush=True)
    
    total_required = sum(metrics[s]["required"] for s in shifts)
    total_assignable = sum(metrics[s]["assignable"] for s in shifts)
    
    print(f"   Total required shifts: {total_required}", flush=True)
    print(f"   Total assignable slots: {total_assignable}", flush=True)
    
    unavailable = data.get("unavailable", {})
    unavailable_nurses = set(unavailable.get("nurses", []) if unavailable else [])
    available_nurses = [n for n in nurses if n not in unavailable_nurses]
    
    min_days_off = constraints.get("min_days_off_per_week", 0)
    max_shifts_per_nurse = days - (min_days_off * (days // 7))
    total_capacity = len(available_nurses) * max_shifts_per_nurse
    
    print(f"   Max shifts per nurse: {max_shifts_per_nurse}", flush=True)
    print(f"   Total capacity ({len(available_nurses)} nurses): {total_capacity}", flush=True)
    
    if total_capacity < total_required:
        print(f"   ❌ INFEASIBLE: Capacity {total_capacity} < Required {total_required}", flush=True)
        return {
            "success": False,
            "reason": f"Insufficient total capacity: {total_capacity} < {total_required}",
        }
    
    print(f"   ✅ Capacity check passed", flush=True)
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 3: Build constraint model
    # ════════════════════════════════════════════════════════════════════
    print(f"\n🔢 [SOLVER] MODEL BUILDING PHASE...", flush=True)
    
    model = cp_model.CpModel()
    
    # Decision variables
    print(f"   Creating {len(nurses) * days * len(shifts)} decision variables...", flush=True)
    X = {}
    for n in nurses:
        for d in range(days):
            for s in shifts:
                X[(n, d, s)] = model.NewBoolVar(f"{n}_{d}_{s}")
    
    # One shift per day per nurse
    print(f"   Adding one-shift-per-day constraints...", flush=True)
    for n in nurses:
        for d in range(days):
            model.Add(sum(X[(n, d, s)] for s in shifts) <= 1)
    
    # HARD: Coverage constraints (non-negotiable)
    print(f"   Adding HARD coverage constraints ({days * len(shifts)} constraints)...", flush=True)
    for d in range(days):
        for s in shifts:
            model.Add(sum(X[(n, d, s)] for n in nurses) == coverage[d][s])
    
    # ════════════════════════════════════════════════════════════════════
    # Mandatory rest rule: max 2 consecutive nights
    # ════════════════════════════════════════════════════════════════════
    print(f"   Adding night rest constraints (max 2 consecutive)...", flush=True)
    
    previous_shifts = data.get("previous_shifts", {})
    for n in nurses:
        prev = previous_shifts.get(n, ["off", "off"])
        prev_minus_2 = 1 if prev[0] == "night" else 0
        prev_minus_1 = 1 if prev[1] == "night" else 0
        
        if prev_minus_2 and prev_minus_1 and days > 0:
            model.Add(sum(X[(n, 0, s)] for s in shifts) == 0)
        
        if prev_minus_1 and days > 1:
            night_on_0 = X[(n, 0, "night")]
            any_shift_on_1 = sum(X[(n, 1, s)] for s in shifts)
            model.Add(night_on_0 + any_shift_on_1 <= 1)
        
        for d in range(days - 2):
            night_on_d = X[(n, d, "night")]
            night_on_d_plus_1 = X[(n, d + 1, "night")]
            any_shift_on_d_plus_2 = sum(X[(n, d + 2, s)] for s in shifts)
            model.Add(night_on_d + night_on_d_plus_1 + any_shift_on_d_plus_2 <= 2)
    
    # Unavailable nurses
    if unavailable:
        unavailable_days = set(unavailable.get("days", []))
        if unavailable_nurses and unavailable_days:
            print(f"   Blocking {len(unavailable_nurses)} nurses on {len(unavailable_days)} days...", flush=True)
            for n in unavailable_nurses:
                for d in unavailable_days:
                    for s in shifts:
                        model.Add(X[(n, d, s)] == 0)
    
    # Workload tracking
    print(f"   Setting up workload balancing...", flush=True)
    total_shifts = {}
    for n in nurses:
        total_shifts[n] = model.NewIntVar(0, days, f"total_{n}")
        model.Add(total_shifts[n] == sum(X[(n, d, s)] for d in range(days) for s in shifts))
    
    avg_load = total_required // len(available_nurses) if available_nurses else 0
    remainder = total_required % len(available_nurses) if available_nurses else 0
    print(f"   Target avg load per nurse: {avg_load} (with {remainder} at +1)", flush=True)
    
    # Shift type tracking
    print(f"   Tracking shift type counts...", flush=True)
    shift_count = {}
    for n in nurses:
        for s in shifts:
            shift_count[(n, s)] = model.NewIntVar(0, days, f"{n}_{s}_count")
            model.Add(shift_count[(n, s)] == sum(X[(n, d, s)] for d in range(days)))
    
    # Hard constraints for shift type limits (nurse preferences)
    print(f"   Adding nurse shift type limits (hard constraints)...", flush=True)
    hard_limit_count = 0
    for n in nurses:
        nurse_limits = max_shifts_per_type.get(n, {})
        for s in shifts:
            limit = nurse_limits.get(s, None)
            if limit is not None:
                if limit < 0:
                    model.Add(shift_count[(n, s)] == 0)
                    hard_limit_count += 1
                else:
                    # Limit based on assignable capacity, not preference
                    assignable_limit = limit
                    model.Add(shift_count[(n, s)] <= assignable_limit)
                    hard_limit_count += 1
    
    print(f"   ✅ {hard_limit_count} shift type limits enforced", flush=True)
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 4: Build objective (preference satisfaction + fairness)
    # ════════════════════════════════════════════════════════════════════
    print(f"\n🎯 [SOLVER] OBJECTIVE BUILDING PHASE...", flush=True)
    
    preference_terms = []
    for n in nurses:
        for d in range(days):
            for s in shifts:
                w = preferences.get(n, {}).get(s, 0)
                if w > 0:
                    preference_terms.append(w * X[(n, d, s)])
    
    print(f"   {len(preference_terms)} preference terms with weights > 0", flush=True)
    
    # Workload balancing (soft constraint)
    workload_penalties = []
    if available_nurses:
        for n in available_nurses:
            dev = model.NewIntVar(0, days, f"dev_{n}")
            model.Add(dev >= total_shifts[n] - avg_load)
            model.Add(dev >= avg_load - total_shifts[n])
            workload_penalties.append(-100 * dev)
    
    # Night pair tracking (encourage back-to-back nights)
    consec_night = {}
    for n in nurses:
        for d in range(days - 1):
            consec_night[(n, d)] = model.NewBoolVar(f"{n}_{d}_consec_night")
            night_d = X[(n, d, "night")]
            night_d_plus_1 = X[(n, d + 1, "night")]
            model.Add(consec_night[(n, d)] <= night_d)
            model.Add(consec_night[(n, d)] <= night_d_plus_1)
            model.Add(consec_night[(n, d)] >= night_d + night_d_plus_1 - 1)
    
    consec_night_count = {}
    nno_rewards = []
    for n in nurses:
        consec_night_count[n] = model.NewIntVar(0, days, f"{n}_consec_night_count")
        model.Add(consec_night_count[n] == sum(consec_night[(n, d)] for d in range(days - 1)))
        nno_rewards.append(50 * consec_night_count[n])
    
    print(f"   ✅ Added {len(workload_penalties)} workload penalties", flush=True)
    print(f"   ✅ Added {len(nno_rewards)} night-pair rewards", flush=True)
    
    # Objective
    objective = sum(preference_terms) + sum(workload_penalties) + sum(nno_rewards)
    model.Maximize(objective)
    
    print(f"   🎯 Objective: preferences + fairness + night patterns", flush=True)
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 5: Solve
    # ════════════════════════════════════════════════════════════════════
    print(f"\n🚀 [SOLVER] SOLVING PHASE...", flush=True)
    
    num_vars = len(nurses) * days * len(shifts)
    total_buffer = total_assignable - total_required
    
    if total_buffer > 10:
        workers = 8
        timeout = 5.0
        print(f"   Large buffer ({total_buffer}): Using {workers} workers, {timeout}s timeout", flush=True)
    elif total_buffer > 0:
        workers = 4
        timeout = 10.0
        print(f"   Moderate buffer ({total_buffer}): Using {workers} workers, {timeout}s timeout", flush=True)
    else:
        workers = 1
        timeout = 15.0
        print(f"   Tight buffer ({total_buffer}): Using {workers} worker, {timeout}s timeout (focused search)", flush=True)
    
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = workers
    solver.parameters.cp_model_presolve = True
    solver.parameters.log_search_progress = False
    
    print(f"   ⏱️  Solving...", flush=True)
    status = solver.Solve(model)
    
    print(f"\n📊 [SOLVER] Status: {status}", flush=True)
    if status == cp_model.OPTIMAL:
        print(f"   ✅ OPTIMAL solution found", flush=True)
    elif status == cp_model.FEASIBLE:
        print(f"   ⚠️  FEASIBLE solution found (not proven optimal)", flush=True)
    else:
        print(f"   ❌ NO FEASIBLE SOLUTION", flush=True)
        return {"success": False, "reason": "Solver could not find feasible solution"}
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 6: Extract and validate results
    # ════════════════════════════════════════════════════════════════════
    print(f"\n📤 [SOLVER] EXTRACTION PHASE...", flush=True)
    
    roster = {n: [] for n in nurses}
    shift_totals = {s: 0 for s in shifts}
    coverage_by_day_shift = {d: {s: 0 for s in shifts} for d in range(days)}
    nurse_workload = {}
    
    for n in nurses:
        nurse_shifts = 0
        for d in range(days):
            assigned = "off"
            for s in shifts:
                if solver.Value(X[(n, d, s)]) == 1:
                    assigned = s
                    shift_totals[assigned] = shift_totals.get(assigned, 0) + 1
                    coverage_by_day_shift[d][assigned] += 1
                    nurse_shifts += 1
            roster[n].append(assigned)
        nurse_workload[n] = nurse_shifts
    
    # Verification
    print(f"\n✅ [SOLVER] VERIFICATION:", flush=True)
    
    print(f"\n   Coverage by shift type:", flush=True)
    all_coverage_met = True
    for s in solve_order:
        required = metrics[s]["required"]
        actual = shift_totals.get(s, 0)
        status = "✅" if actual == required else "❌"
        print(f"      {status} {s.upper():7s}: {actual:3d} / {required:3d}", flush=True)
        if actual != required:
            all_coverage_met = False
    
    if all_coverage_met:
        print(f"\n   ✅ All coverage requirements MET", flush=True)
    else:
        print(f"\n   ❌ Some coverage requirements NOT met", flush=True)
    
    print(f"\n   Workload distribution:", flush=True)
    min_load = min(nurse_workload.values()) if nurse_workload else 0
    max_load = max(nurse_workload.values()) if nurse_workload else 0
    print(f"      Range: {min_load} - {max_load} shifts", flush=True)
    print(f"      Target: {avg_load} ± 1", flush=True)
    if max_load - min_load <= 1:
        print(f"      ✅ Fair distribution (perfectly balanced)", flush=True)
    elif max_load - min_load <= 2:
        print(f"      ✅ Acceptable (difference of {max_load - min_load})", flush=True)
    else:
        print(f"      ⚠️  Unbalanced (difference of {max_load - min_load})", flush=True)
    
    pref_score = sum(
        preferences.get(n, {}).get(s, 0) * (1 if roster[n][d] == s else 0)
        for n in nurses for d in range(days) for s in shifts
    )
    max_pref_score = sum(
        preferences.get(n, {}).get(s, 0)
        for n in nurses for d in range(days) for s in shifts
    )
    
    print(f"\n   Preference satisfaction:", flush=True)
    print(f"      Achieved: {pref_score} / {max_pref_score} ({100*pref_score//max_pref_score if max_pref_score > 0 else 0}%)", flush=True)
    
    return {
        "success": True,
        "roster": roster,
        "workload": nurse_workload,
        "shift_totals": shift_totals,
        "required": {s: metrics[s]["required"] for s in shifts},
        "preference_score": pref_score,
        "max_preference_score": max_pref_score,
        "solve_order": solve_order,
        "flexibility_metrics": metrics,
    }


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = solve(data)
    print(json.dumps(result))