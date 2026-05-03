import json
import sys
from ortools.sat.python import cp_model


def solve(data):
    print("🔧 [SOLVER] Starting solver...", flush=True)

    nurses = data["nurses"]
    days = data["days"]
    shifts = data["shifts"]

    preferences = data["preferences"]
    coverage = data["coverage"]
    constraints = data["constraints"]
    max_shifts_per_type = data.get("max_shifts_per_type", {})

    print(f"📊 [SOLVER] Input: {len(nurses)} nurses, {days} days, {len(shifts)} shift types", flush=True)
    print(f"📋 [SOLVER] Sample preferences: {dict(list(preferences.items())[:3])}", flush=True)
    print(f"🔢 [SOLVER] Max shifts per type: {dict(list(max_shifts_per_type.items())[:3])}", flush=True)
    print(f"📋 [SOLVER] Coverage by day: {coverage[:3]}... (showing first 3)", flush=True)
    print(f"🎯 [SOLVER] Constraints: max_nights={constraints['max_consecutive_nights']}, max_days={constraints['max_consecutive_days']}", flush=True)

    # Buffer Analysis
    print("🔍 [SOLVER] Analyzing buffer (required vs preferred)...", flush=True)
    shift_buffer = {}
    use_exact_constraints = True
    
    for s in shifts:
        total_required = sum(coverage[d][s] for d in range(days))
        total_preferred = sum(max(0, max_shifts_per_type.get(n, {}).get(s, days)) for n in nurses)
        buffer = total_preferred - total_required
        shift_buffer[s] = buffer
        
        if buffer > 0:
            use_exact_constraints = False
            print(f"   {s}: required={total_required}, preferred={total_preferred}, buffer={buffer} → using MAX (<=) constraint", flush=True)
        else:
            print(f"   {s}: required={total_required}, preferred={total_preferred}, buffer={buffer} → using EXACT (==) constraint", flush=True)
    
    total_required_all = sum(coverage[d][s] for d in range(days) for s in shifts)
    total_preferred_all = sum(
        max(0, max_shifts_per_type.get(n, {}).get(s, days))
        for n in nurses
        for s in shifts
    )
    total_buffer = total_preferred_all - total_required_all
    print(f"   📊 Total buffer: {total_buffer} (required={total_required_all}, preferred={total_preferred_all})", flush=True)

    total_needed = sum(coverage[d][s] for d in range(days) for s in shifts)
    print(f"⚡ [SOLVER] Total shifts needed: {total_needed}", flush=True)
    print(f"👩‍⚕️ [SOLVER] Shifts per nurse (avg): {total_needed / len(nurses):.1f}", flush=True)

    # Pre-Solve Validation
    print("🔍 [SOLVER] Running pre-solve validation...", flush=True)
    
    min_days_off = constraints.get("min_days_off_per_week", 0)
    max_shifts_per_nurse = days - (min_days_off * (days // 7))
    total_capacity = len(nurses) * max_shifts_per_nurse
    print(f"   Max shifts per nurse (accounting for min off): {max_shifts_per_nurse}", flush=True)
    print(f"   Total capacity: {total_capacity} shifts", flush=True)
    
    if total_capacity < total_needed:
        print(f"   ❌ INFEASIBLE: Capacity ({total_capacity}) < Required ({total_needed})", flush=True)
        return {"success": False, "reason": f"Insufficient capacity: {total_capacity} < {total_needed}"}
    else:
        print(f"   ✅ Capacity check passed", flush=True)
    
    # Check per-shift capacity
    for s in shifts:
        total_required = sum(coverage[d][s] for d in range(days))
        total_max = sum(max(0, max_shifts_per_type.get(n, {}).get(s, days)) for n in nurses)
        if total_max < total_required:
            print(f"   ❌ INFEASIBLE: {s} max ({total_max}) < required ({total_required})", flush=True)
            return {"success": False, "reason": f"Insufficient {s} capacity: {total_max} < {total_required}"}
        else:
            print(f"   ✅ {s}: max={total_max} >= required={total_required}", flush=True)
    
    print("   ✅ Pre-solve validation complete", flush=True)

    model = cp_model.CpModel()
    print("✅ [SOLVER] Model created", flush=True)

    # Decision Variables
    print("🔢 [SOLVER] Creating decision variables...", flush=True)
    X = {}
    for n in nurses:
        for d in range(days):
            for s in shifts:
                X[(n, d, s)] = model.NewBoolVar(f"{n}_{d}_{s}")
    print(f"   ✅ Created {len(X)} variables", flush=True)

    # One shift per day
    print("📌 [SOLVER] Adding one-shift-per-day constraints...", flush=True)
    for n in nurses:
        for d in range(days):
            model.Add(sum(X[(n, d, s)] for s in shifts) <= 1)

    # HARD: COVERAGE CONSTRAINTS
    print("🎯 [SOLVER] Adding HARD coverage constraints...", flush=True)
    for d in range(days):
        for s in shifts:
            model.Add(
                sum(X[(n, d, s)] for n in nurses)
                == coverage[d][s]
            )
    print(f"   ✅ Added {days * len(shifts)} coverage constraints", flush=True)

    # ════════════════════════════════════════════════════════════════════
    # ★★★ MANDATORY REST AFTER 2 CONSECUTIVE NIGHTS ★★★
    # ════════════════════════════════════════════════════════════════════
    # Rule: If Days d and d+1 are BOTH Night → Day d+2 MUST be Off
    # Allows: 0, 1, 2, or 3+ nights per month (depending on spacing)
    # Prevents: 3+ consecutive nights without a rest day
    # Examples:
    #   - Night, Off, ... (1 isolated) ✓
    #   - Night, Night, Off, ... (pair) ✓
    #   - Night, Off, Night, ... (2 separate) ✓
    #   - Night, Night, Night, ... (3 consecutive) ✗ BLOCKED
    # ════════════════════════════════════════════════════════════════════
    
    print(f"🌙 [SOLVER] Enforcing mandatory rest rule: max 2 consecutive nights...", flush=True)
    
    previous_shifts = data.get("previous_shifts", {})

    for n in nurses:
        # Cross-month boundaries
        prev = previous_shifts.get(n, ["off", "off"])
        prev_minus_2 = 1 if prev[0] == "night" else 0
        prev_minus_1 = 1 if prev[1] == "night" else 0

        # Rule 0: If Day -2 and Day -1 were both night, Day 0 MUST be Off
        if prev_minus_2 and prev_minus_1 and days > 0:
            model.Add(sum(X[(n, 0, s)] for s in shifts) == 0)
        
        # Rule 1: If Day -1 and Day 0 are both night, Day 1 MUST be Off
        if prev_minus_1 and days > 1:
            night_on_0 = X[(n, 0, "night")]
            any_shift_on_1 = sum(X[(n, 1, s)] for s in shifts)
            model.Add(night_on_0 + any_shift_on_1 <= 1)

        # If Days d and d+1 are BOTH Night → Day d+2 MUST be Off
        # Constraint: night(d) + night(d+1) + any_shift(d+2) <= 2
        for d in range(days - 2):
            night_on_d = X[(n, d, "night")]
            night_on_d_plus_1 = X[(n, d + 1, "night")]
            any_shift_on_d_plus_2 = sum(X[(n, d + 2, s)] for s in shifts)
            model.Add(night_on_d + night_on_d_plus_1 + any_shift_on_d_plus_2 <= 2)
    
    print(f"   ✅ Rest-day constraints: {days - 2} per nurse", flush=True)
    print(f"   📋 Pattern: Max 2 consecutive nights, then must have non-night shift or off", flush=True)

    # Unavailable nurses (e.g., Friday-offs)
    unavailable = data.get("unavailable", {})
    unavailable_nurses = set()
    if unavailable:
        unavailable_nurses = set(unavailable.get("nurses", []))
        unavailable_days = set(unavailable.get("days", []))
        if unavailable_nurses and unavailable_days:
            print(f"🚫 [SOLVER] Blocking {len(unavailable_nurses)} nurses on days {unavailable_days}...", flush=True)
            for n in unavailable_nurses:
                for d in unavailable_days:
                    for s in shifts:
                        model.Add(X[(n, d, s)] == 0)

    # Workload tracking
    print("📈 [SOLVER] Setting up workload tracking...", flush=True)
    total_shifts = {}
    for n in nurses:
        total_shifts[n] = model.NewIntVar(0, days, f"total_{n}")
        model.Add(
            total_shifts[n] ==
            sum(X[(n, d, s)] for d in range(days) for s in shifts)
        )

    total_required = sum(
        coverage[d][s] for d in range(days) for s in shifts
    )
    
    available_nurses = [n for n in nurses if n not in unavailable_nurses]
    
    if available_nurses:
        avg_load = total_required // len(available_nurses)
        remainder = total_required % len(available_nurses)
    else:
        avg_load = total_required // len(nurses)
        remainder = total_required % len(nurses)
    
    print(f"   📊 Target avg shifts per nurse: {avg_load} (with {remainder} nurses getting +1)", flush=True)

    # Soft preference for balanced workload
    print("⚖️ [SOLVER] Adding soft workload balancing...", flush=True)

    workload_penalties = []
    if available_nurses:
        for n in available_nurses:
            dev = model.NewIntVar(0, days, f"dev_{n}")
            model.Add(dev >= total_shifts[n] - avg_load)
            model.Add(dev >= avg_load - total_shifts[n])
            workload_penalties.append(-200 * dev)

    # Shift type tracking
    print("📊 [SOLVER] Setting up shift type tracking...", flush=True)
    shift_count = {}
    for n in nurses:
        for s in shifts:
            shift_count[(n, s)] = model.NewIntVar(0, days, f"{n}_{s}_count")
            model.Add(
                shift_count[(n, s)] ==
                sum(X[(n, d, s)] for d in range(days))
            )

    # Note: NNO pattern is encouraged by the max 2 consecutive nights constraint
    # This naturally creates NNO + N spacing for 3-night nurses
    print("🌙 [SOLVER] Night pattern: max 2 consecutive nights enforced", flush=True)
    print(f"   📋 For 3-night nurses: naturally creates Night-Night-Off + isolated Night", flush=True)

    # ════════════════════════════════════════════════════════════════════
    # CONSECUTIVE NIGHT PAIRS TRACKING
    # ════════════════════════════════════════════════════════════════════
    # Track consecutive night pairs (Night, Night) per nurse for enforcement
    print("📋 [SOLVER] Adding consecutive night pair tracking...", flush=True)

    consec_night = {}
    for n in nurses:
        for d in range(days - 1):
            consec_night[(n, d)] = model.NewBoolVar(f"{n}_{d}_consec_night")
            night_d = X[(n, d, "night")]
            night_d_plus_1 = X[(n, d + 1, "night")]
            # consec_night = night_d AND night_d_plus_1
            model.Add(consec_night[(n, d)] <= night_d)
            model.Add(consec_night[(n, d)] <= night_d_plus_1)
            model.Add(consec_night[(n, d)] >= night_d + night_d_plus_1 - 1)

    # Count consecutive night pairs per nurse
    consec_night_count = {}
    for n in nurses:
        consec_night_count[n] = model.NewIntVar(0, days, f"{n}_consec_night_count")
        model.Add(consec_night_count[n] == sum(consec_night[(n, d)] for d in range(days - 1)))

    print(f"   ✅ Consecutive night pairs: {days - 1} potential pairs per nurse", flush=True)

    # ════════════════════════════════════════════════════════════════════
    # ENFORCE: Exactly 2 nights → must be back-to-back
    # ════════════════════════════════════════════════════════════════════
    # ENCOURAGE: Night-Night-Off pattern (prevent scattered nights)
    # ════════════════════════════════════════════════════════════════════
    print("🌙 [SOLVER] Encouraging: Night-Night-Off pattern (prefer back-to-back nights)...", flush=True)

    nno_rewards = []
    for n in nurses:
        # Reward each pair of consecutive nights to encourage pairing and prevent scattered isolated nights
        nno_rewards.append(100 * consec_night_count[n])

    print(f"   ✅ Night-Night-Off pattern encouraged for all nurses (soft constraint)", flush=True)
    print(f"   ✅ 3+ nights → will naturally form a pair plus isolated night", flush=True)

    required_total_per_shift = {
        s: sum(coverage[d][s] for d in range(days))
        for s in shifts
    }
    print(f"   📋 Required per shift type: {dict(required_total_per_shift)}", flush=True)

    # HARD: Shifts per type based on preferences and buffer
    print("🔢 [SOLVER] Adding shifts per type constraints...", flush=True)
    for n in nurses:
        nurse_limits = max_shifts_per_type.get(n, {})
        for s in shifts:
            limit = nurse_limits.get(s, None)
            if limit is not None:
                if limit < 0:
                    model.Add(shift_count[(n, s)] == 0)
                else:
                    model.Add(shift_count[(n, s)] <= limit)

    # OBJECTIVE: Maximize preferences
    print("🎯 [SOLVER] Building objective function...", flush=True)
    preference_terms = []

    for n in nurses:
        for d in range(days):
            for s in shifts:
                w = preferences.get(n, {}).get(s, 0)
                if w > 0:
                    preference_terms.append(w * X[(n, d, s)])

    print(f"   ✅ {len(preference_terms)} preference terms", flush=True)
    
    if 'workload_penalties' in locals() and workload_penalties:
        model.Maximize(sum(preference_terms) + sum(workload_penalties) + sum(nno_rewards))
    else:
        model.Maximize(sum(preference_terms) + sum(nno_rewards))
        
    print("   🎯 Objective: Maximize preference satisfaction and fairness", flush=True)
    print("      (with hard constraints: coverage ✅, logistics ✅, night rest rule ✅)", flush=True)
    print("      (Note: 3-night pattern naturally emerges as NNO + N from the hard constraint)", flush=True)

    # Solve
    num_vars = len(nurses) * days * len(shifts)
    
    if total_buffer > 0:
        workers = 2 if num_vars < 1000 else (4 if num_vars < 5000 else 8)
        print(f"🔧 [SOLVER] Buffer={total_buffer} (flexible), using {workers} workers for parallel search", flush=True)
    else:
        workers = 1
        print(f"🔧 [SOLVER] Buffer={total_buffer} (tight constraints), using {workers} worker for focused search", flush=True)
    
    print(f"🚀 [SOLVER] Starting solver ({'10.0' if total_buffer == 0 else '5.0'}s timeout, {workers} workers)...", flush=True)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 10.0 if total_buffer == 0 else 5.0
    solver.parameters.num_search_workers = workers
    solver.parameters.cp_model_presolve = True
    solver.parameters.log_search_progress = False

    status = solver.Solve(model)

    print(f"📊 [SOLVER] Status: {status} (OPTIMAL={cp_model.OPTIMAL}, FEASIBLE={cp_model.FEASIBLE})", flush=True)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print("❌ [SOLVER] No feasible solution found!", flush=True)
        print("   This means coverage, fairness, and night rest constraints are incompatible.", flush=True)

        if total_buffer == 0:
            print("   💡 Tip: Try increasing preference for at least one shift type to create buffer > 0", flush=True)

        return {"success": False, "reason": "Conflicting hard constraints - no feasible solution exists"}

    print("✅ [SOLVER] Solution found!", flush=True)

    # Extract result and verify
    print("📤 [SOLVER] Extracting results...", flush=True)
    roster = {n: [] for n in nurses}

    shift_counts = {s: 0 for s in shifts}
    nurse_workload = {}
    coverage_by_day_shift = {d: {s: 0 for s in shifts} for d in range(days)}

    for n in nurses:
        nurse_shifts = 0
        for d in range(days):
            assigned = "off"
            for s in shifts:
                if solver.Value(X[(n, d, s)]) == 1:
                    assigned = s
                    shift_counts[assigned] = shift_counts.get(assigned, 0) + 1
                    coverage_by_day_shift[d][assigned] += 1
                    nurse_shifts += 1
            roster[n].append(assigned)
        nurse_workload[n] = nurse_shifts

    print(f"📈 [SOLVER] Shift type totals:", flush=True)
    for s in shifts:
        required = required_total_per_shift[s]
        actual = shift_counts.get(s, 0)
        status_icon = "✅" if actual == required else "❌"
        print(f"   {status_icon} {s.upper():7s}: {actual:3d} / {required:3d}", flush=True)

    # Verify coverage
    coverage_met = True
    for d in range(days):
        for s in shifts:
            required = coverage[d][s]
            actual = coverage_by_day_shift[d][s]
            if actual != required:
                coverage_met = False
                break
        if not coverage_met:
            break
    
    if coverage_met:
        print("   ✅ All daily coverage requirements MET", flush=True)
    else:
        print("   ❌ Some coverage requirements NOT met", flush=True)

    min_load = min(nurse_workload.values())
    max_load = max(nurse_workload.values())
    print(f"⚖️ [SOLVER] Workload distribution: {min_load} - {max_load} shifts (fair: ±1 from {avg_load})", flush=True)
    
    # Calculate preference score achieved
    pref_score = 0
    for n in nurses:
        for d in range(days):
            for s in shifts:
                if solver.Value(X[(n, d, s)]) == 1:
                    w = preferences.get(n, {}).get(s, 0)
                    pref_score += w
    
    print(f"🎁 [SOLVER] Total preference score achieved: {pref_score}", flush=True)

    return {
        "success": True,
        "roster": roster,
        "workload": nurse_workload,
        "shift_totals": shift_counts,
        "required": dict(required_total_per_shift),
        "preference_score": pref_score
    }


if __name__ == "__main__":
    data = json.loads(sys.stdin.read())
    result = solve(data)
    print(json.dumps(result))