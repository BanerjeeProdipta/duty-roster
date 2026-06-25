import json
import sys
from ortools.sat.python import cp_model
from typing import Dict, Optional
import math


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


def solve(data, soft_override: Optional[set] = None):
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
    
    # Coverage minimum constraints — at least this many nurses per shift per day.
    # Overstaffing is allowed (preference targets may push total above minimum).
    print(f"   Adding coverage minimum constraints ({days * len(shifts)} constraints)...", flush=True)
    for d in range(days):
        for s in shifts:
            model.Add(sum(X[(n, d, s)] for n in nurses) >= coverage[d][s])
    
    # ════════════════════════════════════════════════════════════════════
    # Friday overstaffing — discouraged but not forbidden.
    # The solver may assign extra nurses on Friday to meet preference
    # targets.  A soft penalty in the objective discourages overstaffing
    # while allowing it when necessary for preference fulfillment.
    # ════════════════════════════════════════════════════════════════════
    friday_indices: list[int] = data.get("friday_indices", [])

    # ════════════════════════════════════════════════════════════════════
    # FIX #2: Friday nurse blocklist — explicit per-nurse Friday block.
    # The spec defines FRIDAY_OFF_NURSES; the caller passes them via
    # data["friday_off_nurses"]. Previously this relied on the TS layer
    # to pre-process into unavailable{}, which was undocumented.
    # ════════════════════════════════════════════════════════════════════
    friday_off_nurses: list[str] = data.get("friday_off_nurses", [])
    if friday_off_nurses and friday_indices:
        print(f"   Blocking {len(friday_off_nurses)} nurses from all Friday shifts...", flush=True)
        for n in friday_off_nurses:
            if n not in nurses:
                continue
            for d in friday_indices:
                if d < days:
                    for s in shifts:
                        model.Add(X[(n, d, s)] == 0)

    # ════════════════════════════════════════════════════════════════════
    # FIX #3: Mandatory rest rule — corrected NNO (Night-Night-Off).
    # Spec: after 2 consecutive nights the NEXT day must be fully off.
    # Old code: sliding window allowed morning/evening on day+2 after 2
    # nights because `any_shift <= 0` was never enforced as equality=0.
    # New code: explicit model.Add(any_shift_on_d_plus_2 == 0).
    # ════════════════════════════════════════════════════════════════════
    max_consecutive_nights = constraints.get("max_consecutive_nights", 2)
    if "night" in shifts:
        print(f"   Adding NNO rest constraints (max {max_consecutive_nights} consecutive nights → forced day off)...", flush=True)
    else:
        print(f"   Skipping NNO rest (no night shift in roster)", flush=True)

    if "night" in shifts:
        previous_shifts = data.get("previous_shifts", {})
        for n in nurses:
            prev = previous_shifts.get(n, ["off", "off"])
            # Ensure prev always has at least 2 entries
            while len(prev) < 2:
                prev = ["off"] + prev
            prev_minus_2 = 1 if prev[-2] == "night" else 0
            prev_minus_1 = 1 if prev[-1] == "night" else 0

            # Cross-month: if last 2 days were both nights → day 0 must be off
            if prev_minus_2 and prev_minus_1 and days > 0:
                model.Add(sum(X[(n, 0, s)] for s in shifts) == 0)

            # Cross-month: if last day was night → night on day 0 would make 2
            # consecutive → day 1 must be fully off (NNO rest).
            if prev_minus_1 and days > 1:
                night_on_0 = X[(n, 0, "night")]
                # If night[prev] + night[0] == 2, day 1 must be off
                # Encode as: night[0] == 1 → any_shift[1] == 0
                # Equivalent: night[0] + any_shift[1] <= 1
                # But we need exact NNO, so:
                # night[prev-1] + night[0] + any_shift[1] <= 2
                # and separately: when night[prev-1]=1 and night[0]=1 → any_shift[1]=0
                # The tight bound <= 2 already achieves this when prev_minus_1=1 (constant):
                # 1 + night[0] + any_shift[1] <= 2  →  night[0] + any_shift[1] <= 1 ✓
                any_shift_on_1 = sum(X[(n, 1, s)] for s in shifts)
                model.Add(night_on_0 + any_shift_on_1 <= 1)

            for d in range(days - max_consecutive_nights):
                night_on_d   = X[(n, d, "night")]
                night_on_d1  = X[(n, d + 1, "night")]
                any_on_d2    = sum(X[(n, d + 2, s)] for s in shifts)

                # Max consecutive nights cap (prevents N+1 consecutive nights)
                model.Add(night_on_d + night_on_d1 + any_on_d2 <= max_consecutive_nights)

                # FIX #3 core: NNO — if both night[d] and night[d+1] are 1,
                # day d+2 must be fully off (any_on_d2 == 0).
                # Encoded as: night[d] + night[d+1] + any_on_d2 <= 2, which is
                # already captured above when max_consecutive_nights == 2.
                # For clarity and correctness regardless of max_consecutive_nights,
                # add the explicit rest-day constraint:
                #   night[d] + night[d+1] - 1 <= (1 - any_on_d2)
                # i.e.  any_on_d2 <= 2 - night[d] - night[d+1]
                # When both nights = 1: any_on_d2 <= 0  → forced off ✓
                # When only one or zero nights: any_on_d2 <= 1 or 2  → unconstrained ✓
                model.Add(any_on_d2 <= 2 - night_on_d - night_on_d1)

    # ════════════════════════════════════════════════════════════════════
    # Max consecutive working days (any shift type)
    # ════════════════════════════════════════════════════════════════════
    max_consecutive_days = constraints.get("max_consecutive_days", 6)
    print(f"   Adding max consecutive working days constraint ({max_consecutive_days} days)...", flush=True)
    for n in nurses:
        for d in range(days - max_consecutive_days):
            sum_consec = sum(
                sum(X[(n, d + offset, s)] for s in shifts)
                for offset in range(max_consecutive_days + 1)
            )
            model.Add(sum_consec <= max_consecutive_days)
    
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
    
    # Shift type limits are enforced below in the per-nurse preference
    # fulfillment section (business logic rule #6).

    # Enforce preference fulfillment: per-nurse exact equality for every
    # (nurse, shift) pair with positive target (business logic rule #6).
    print(f"   Adding preference-fulfillment constraints...", flush=True)

    # Cap night target to feasible maximum given consecutive-night restriction.
    night_rest_max = (
        math.ceil(days / (max_consecutive_nights + 1)) * max_consecutive_nights
    )

    # ── Per-nurse target computation (from max_shifts_per_type) ──
    # Use the TypeScript-computed (and adjusted) max_shifts_per_type
    # values as exact equality targets.  These already use
    #   Math.round(weight / 100 * days)
    # with the per-nurse total capped to days - 5 (MAX_PREF_OFF).
    # This ensures `assigned == pref_display` in the roster table.
    print(f"\n   📐 Computing per-nurse preference targets (from max_shifts_per_type)...", flush=True)

    requested_mins: dict[str, list[tuple[str, int]]] = {s: [] for s in shifts}
    for n in nurses:
        nurse_caps = max_shifts_per_type.get(n, {})
        for s in shifts:
            if nurse_caps:
                req = max(0, nurse_caps.get(s, 0))
            else:
                pref_pct = preferences.get(n, {}).get(s, 0)
                req = max(0, int(pref_pct / 100.0 * days + 0.5))
            if req <= 0:
                continue
            if s == "night":
                req = min(req, night_rest_max)
            if req > 0:
                requested_mins[s].append((n, req))

    # ── Per-nurse exact preference enforcement ────────────────────────────
    # Business logic rule #6: each nurse's count of each shift type MUST
    # EQUAL their preference target.  Enforce exact equality for every
    # (nurse, shift) pair with capped_req > 0, unless the shift type is
    # in the soft_override set (in which case deviations are heavily penalised).
    deviation_penalties: list[cp_model.IntVar] = []
    soft_pairs: list[tuple[str, str, int]] = []
    exact_count = 0

    for s in shifts:
        for n, capped_req in requested_mins[s]:
            if soft_override is not None and s in soft_override:
                soft_pairs.append((n, s, capped_req))
            else:
                model.Add(shift_count[(n, s)] == capped_req)
                exact_count += 1

    print(f"   ✅ {exact_count} exact preference targets", flush=True)
    if soft_pairs:
        print(f"   🎯 {len(soft_pairs)} softened preference targets "
              f"(shift types: {soft_override})", flush=True)
        for n, s, target in soft_pairs:
            shortfall = model.NewIntVar(0, days, f"shortfall_{n}_{s}")
            surplus = model.NewIntVar(0, days, f"surplus_{n}_{s}")
            model.Add(shift_count[(n, s)] == target - shortfall + surplus)
            deviation_penalties.append(-100000 * shortfall)
            deviation_penalties.append(-10000 * surplus)
    
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
    
    # Heavily penalise assigning nurses to shift types with 0% preference.
    # These nurses are left unconstrained (flexible for coverage gaps) but
    # the solver avoids using them unless absolutely required.
    zero_pref_penalties = []
    zero_count = 0
    for n in nurses:
        for s in shifts:
            w = preferences.get(n, {}).get(s, 0)
            if w == 0:
                for d in range(days):
                    zero_pref_penalties.append(-10000 * X[(n, d, s)])
                    zero_count += 1
    ZERO_PENALTY_WEIGHT = 10000
    print(f"   ⛔ {zero_count} zero-preference assignment penalties (weight={ZERO_PENALTY_WEIGHT})", flush=True)
    
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
    if "night" in shifts:
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
    if "night" in shifts:
        for n in nurses:
            consec_night_count[n] = model.NewIntVar(0, days, f"{n}_consec_night_count")
            model.Add(consec_night_count[n] == sum(consec_night[(n, d)] for d in range(days - 1)))
            nno_rewards.append(50 * consec_night_count[n])
    
    print(f"   ✅ Added {len(workload_penalties)} workload penalties", flush=True)
    print(f"   ✅ Added {len(nno_rewards)} night-pair rewards", flush=True)
    
    # Objective: preference satisfaction + workload fairness + night patterns
    #             + target deviation + zero-preference penalties
    objective = (
        sum(preference_terms)
        + sum(workload_penalties)
        + sum(nno_rewards)
        + sum(deviation_penalties)
        + sum(zero_pref_penalties)
    )
    model.Maximize(objective)
    
    print(f"   🎯 Objective: preferences + fairness + night patterns", flush=True)
    
    # ════════════════════════════════════════════════════════════════════
    # STEP 5: Solve
    # ════════════════════════════════════════════════════════════════════
    print(f"\n🚀 [SOLVER] SOLVING PHASE...", flush=True)
    
    total_buffer = total_assignable - total_required
    
    if total_buffer > 10:
        workers = 8
        timeout = 30.0
        print(f"   Large buffer ({total_buffer}): Using {workers} workers, {timeout}s timeout", flush=True)
    elif total_buffer > 0:
        workers = 4
        timeout = 45.0
        print(f"   Moderate buffer ({total_buffer}): Using {workers} workers, {timeout}s timeout", flush=True)
    else:
        workers = 4
        timeout = 60.0
        print(f"   Tight buffer ({total_buffer}): Using {workers} workers, {timeout}s timeout (focused search)", flush=True)
    
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
    elif status == cp_model.UNKNOWN:
        reason = f"Solver timed out ({timeout}s) or ran out of search space. Try increasing timeout or relaxing constraints."
        print(f"   ⏱️  {reason}", flush=True)
        return {"success": False, "reason": reason}
    elif status == cp_model.MODEL_INVALID:
        reason = "Solver model is invalid — check constraint definitions"
        print(f"   ❌ {reason}", flush=True)
        return {"success": False, "reason": reason}
    else:
        print(f"   ❌ NO FEASIBLE SOLUTION", flush=True)
        return {
            "success": False,
            "reason": "No feasible solution found with the current constraint set.",
        }
    
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
    
    preference_deviations: list[dict] = []
    for n, s, target in soft_pairs:
        actual = sum(solver.Value(X[(n, d, s)]) for d in range(days))
        if actual != target:
            preference_deviations.append({
                "nurse": n,
                "shift": s,
                "target": target,
                "actual": actual,
            })

    if preference_deviations:
        print(f"\n   ⚠️  Preference deviations ({len(preference_deviations)}):", flush=True)
        for d in preference_deviations:
            print(f"      {d['nurse']} {d['shift']}: target={d['target']}, actual={d['actual']}", flush=True)
    else:
        print(f"\n   ✅ All preference targets met exactly", flush=True)

    # ════════════════════════════════════════════════════════════════════
    # STEP 7: Post-solve NNO verification
    # ════════════════════════════════════════════════════════════════════
    print(f"\n🔎 [SOLVER] NNO VERIFICATION...", flush=True)
    nno_violations = []
    if "night" in shifts:
        previous_shifts = data.get("previous_shifts", {})
        for n in nurses:
            prev = previous_shifts.get(n, ["off", "off"])
            while len(prev) < 2:
                prev = ["off"] + prev
            full_schedule = list(prev) + roster[n]
            for d in range(len(full_schedule) - max_consecutive_nights):
                window = full_schedule[d : d + max_consecutive_nights + 1]
                nights_in_window = sum(1 for sh in window[:max_consecutive_nights] if sh == "night")
                if nights_in_window == max_consecutive_nights and window[max_consecutive_nights] != "off":
                    real_day = d - len(prev)
                    nno_violations.append({
                        "nurse": n,
                        "day": real_day,
                        "window": window,
                    })
        if nno_violations:
            print(f"   ❌ {len(nno_violations)} NNO violation(s) found!", flush=True)
            for v in nno_violations:
                print(f"      Nurse {v['nurse']} day {v['day']}: {v['window']}", flush=True)
        else:
            print(f"   ✅ No NNO violations", flush=True)

    # Verification (coverage is minimum, so >= is success)
    print(f"\n✅ [SOLVER] VERIFICATION:", flush=True)
    
    print(f"\n   Coverage by shift type (actual / minimum):", flush=True)
    all_coverage_met = True
    for s in solve_order:
        required = metrics[s]["required"]
        actual = shift_totals.get(s, 0)
        status_str = "✅" if actual >= required else "❌"
        excess = actual - required
        print(f"      {status_str} {s.upper():7s}: {actual:3d} / {required:3d}  (excess {excess:+3d})", flush=True)
        if actual < required:
            all_coverage_met = False
    
    if all_coverage_met:
        print(f"\n   ✅ All coverage minimums MET", flush=True)
    else:
        print(f"\n   ❌ Some coverage minimums NOT met", flush=True)
    
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
        "nno_violations": nno_violations,
        "preference_deviations": preference_deviations,
    }


def fallback_solve(data):
    shifts = data["shifts"]

    # First pass: try all-exact
    result = solve(data)

    if result.get("success"):
        return result

    # Infeasible — iteratively soften shift types from most flexible to
    # least flexible (reverse solve_order), re-solving each time.
    print(f"\n♻️  [SOLVER] All-exact infeasible. Trying softened fallback...", flush=True)

    flexibility = analyze_flexibility(data)
    solve_order = flexibility["solve_order"]

    softened = set()
    for s in reversed(solve_order):
        softened.add(s)
        print(f"\n♻️  [SOLVER] Softening {s} (re-solving with softened: {softened})", flush=True)
        result = solve(data, soft_override=softened)
        if result.get("success"):
            result["softened_shifts"] = list(softened)
            return result

    # Last resort: soften all shifts
    print(f"\n⚠️  [SOLVER] All exact+partial attempts failed. Softening ALL shift types.", flush=True)
    result = solve(data, soft_override=set(shifts))
    result["softened_shifts"] = list(shifts)
    return result


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = fallback_solve(data)
    print(json.dumps(result))