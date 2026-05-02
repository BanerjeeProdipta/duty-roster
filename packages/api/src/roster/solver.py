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

    # ----------------------------
    # 0. Buffer Analysis: Required vs Preferred
    # ----------------------------
    print("🔍 [SOLVER] Analyzing buffer (required vs preferred)...", flush=True)
    shift_buffer = {}
    use_exact_constraints = True
    
    for s in shifts:
        total_required = sum(coverage[d][s] for d in range(days))
        total_preferred = sum(max_shifts_per_type.get(n, {}).get(s, 0) for n in nurses)
        buffer = total_preferred - total_required
        shift_buffer[s] = buffer
        
        if buffer > 0:
            use_exact_constraints = False
            print(f"   {s}: required={total_required}, preferred={total_preferred}, buffer={buffer} → using MAX (<=) constraint", flush=True)
        else:
            print(f"   {s}: required={total_required}, preferred={total_preferred}, buffer={buffer} → using EXACT (==) constraint", flush=True)
    
    total_required_all = sum(coverage[d][s] for d in range(days) for s in shifts)
    total_preferred_all = sum(
        max_shifts_per_type.get(n, {}).get(s, 0) 
        for n in nurses 
        for s in shifts
    )
    total_buffer = total_preferred_all - total_required_all
    print(f"   📊 Total buffer: {total_buffer} (required={total_required_all}, preferred={total_preferred_all})", flush=True)

    total_needed = sum(coverage[d][s] for d in range(days) for s in shifts)
    print(f"⚡ [SOLVER] Total shifts needed: {total_needed}", flush=True)
    print(f"👩‍⚕️ [SOLVER] Shifts per nurse (avg): {total_needed / len(nurses):.1f}", flush=True)

    # ----------------------------
    # 0b. Pre-Solve Validation
    # ----------------------------
    print("🔍 [SOLVER] Running pre-solve validation...", flush=True)
    
    # Check 1: Total capacity vs required
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
    
    # Check 2: Per-shift capacity vs required
    for s in shifts:
        total_required = sum(coverage[d][s] for d in range(days))
        total_max = sum(max_shifts_per_type.get(n, {}).get(s, days) for n in nurses)
        if total_max < total_required:
            print(f"   ❌ INFEASIBLE: {s} max ({total_max}) < required ({total_required})", flush=True)
            return {"success": False, "reason": f"Insufficient {s} capacity: {total_max} < {total_required}"}
        else:
            print(f"   ✅ {s}: max={total_max} >= required={total_required}", flush=True)
    
    # Check 3: Per-nurse shift limits vs days available
    for n in nurses:
        nurse_max_total = sum(max_shifts_per_type.get(n, {}).get(s, 0) for s in shifts)
        if nurse_max_total > max_shifts_per_nurse:
            print(f"   ⚠️ {n}: max shifts ({nurse_max_total}) > available days ({max_shifts_per_nurse})", flush=True)
    
    print("   ✅ Pre-solve validation complete", flush=True)

    model = cp_model.CpModel()
    print("✅ [SOLVER] Model created", flush=True)

    # ----------------------------
    # 1. Decision Variables
    # ----------------------------
    print("🔢 [SOLVER] Creating decision variables...", flush=True)
    X = {}
    for n in nurses:
        for d in range(days):
            for s in shifts:
                X[(n, d, s)] = model.NewBoolVar(f"{n}_{d}_{s}")
    print(f"   ✅ Created {len(X)} variables", flush=True)

    # ----------------------------
    # 2. One shift per day
    # ----------------------------
    print("📌 [SOLVER] Adding one-shift-per-day constraints...", flush=True)
    for n in nurses:
        for d in range(days):
            model.Add(sum(X[(n, d, s)] for s in shifts) <= 1)

    # ----------------------------
    # 3. HARD: COVERAGE CONSTRAINTS
    # ----------------------------
    print("🎯 [SOLVER] Adding HARD coverage constraints...", flush=True)
    for d in range(days):
        for s in shifts:
            model.Add(
                sum(X[(n, d, s)] for n in nurses)
                == coverage[d][s]
            )
    print(f"   ✅ Added {days * len(shifts)} coverage constraints", flush=True)

    # ----------------------------
    # 4. Max consecutive nights
    # ----------------------------
    max_nights = constraints["max_consecutive_nights"]
    print(f"🌙 [SOLVER] Adding max {max_nights} consecutive nights constraint...", flush=True)
    for n in nurses:
        for d in range(days - max_nights):
            model.Add(
                sum(X[(n, d + i, "night")] for i in range(max_nights + 1))
                <= max_nights
            )

    # ----------------------------
    # 5. Max consecutive working days
    # ----------------------------
    max_days = constraints["max_consecutive_days"]
    print(f"📅 [SOLVER] Adding max {max_days} consecutive days constraint...", flush=True)
    for n in nurses:
        for d in range(days - max_days):
            model.Add(
                sum(
                    X[(n, d + i, s)]
                    for i in range(max_days + 1)
                    for s in shifts
                )
                <= max_days
            )

    # ----------------------------
    # 6. Min days off per week (if specified)
    # ----------------------------
    min_off = constraints.get("min_days_off_per_week", 0)
    if min_off > 0:
        print(f"📅 [SOLVER] Adding min {min_off} days off per week...", flush=True)
        for n in nurses:
            for week_start in range(0, days, 7):
                week_end = min(week_start + 7, days)
                model.Add(
                    sum(X[(n, d, s)] for d in range(week_start, week_end) for s in shifts)
                    <= (7 - min_off)
                )

    # ----------------------------
    # 7. Unavailable nurses (e.g., Friday-offs)
    # ----------------------------
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

    # ----------------------------
    # 8. Workload tracking
    # ----------------------------
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
    
    # Adjust for unavailable nurses
    available_nurses = [n for n in nurses if n not in unavailable_nurses]
    
    if available_nurses:
        avg_load = total_required // len(available_nurses)
        remainder = total_required % len(available_nurses)
    else:
        avg_load = total_required // len(nurses)
        remainder = total_required % len(nurses)
    
    print(f"   📊 Target avg shifts per nurse: {avg_load} (with {remainder} nurses getting +1)", flush=True)

    # ----------------------------
    # 9. Soft preference for balanced workload
    # ----------------------------
    print("⚖️ [SOLVER] Adding soft workload balancing...", flush=True)

    workload_penalties = []
    if available_nurses:
        for n in available_nurses:
            dev = model.NewIntVar(0, days, f"dev_{n}")
            model.Add(dev >= total_shifts[n] - avg_load)
            model.Add(dev >= avg_load - total_shifts[n])
            # Sufficient penalty to ensure fairness without over-complicating the search tree
            workload_penalties.append(-200 * dev)

    # ----------------------------
    # 10. Shift type tracking
    # ----------------------------
    print("📊 [SOLVER] Setting up shift type tracking...", flush=True)
    shift_count = {}
    for n in nurses:
        for s in shifts:
            shift_count[(n, s)] = model.NewIntVar(0, days, f"{n}_{s}_count")
            model.Add(
                shift_count[(n, s)] ==
                sum(X[(n, d, s)] for d in range(days))
            )

    required_total_per_shift = {
        s: sum(coverage[d][s] for d in range(days))
        for s in shifts
    }
    print(f"   📋 Required per shift type: {dict(required_total_per_shift)}", flush=True)

    # ----------------------------
    # 10b. HARD: Shifts per type based on preferences and buffer
    # ----------------------------
    print("🔢 [SOLVER] Adding shifts per type constraints...", flush=True)
    for n in nurses:
        nurse_limits = max_shifts_per_type.get(n, {})
        for s in shifts:
            limit = nurse_limits.get(s, None)
            if limit is not None:
                if limit < 0:
                    model.Add(shift_count[(n, s)] == 0)
                    print(f"   {n} {s}: BLOCKED", flush=True)
                else:
                    # Use exact (==) if no buffer, max (<=) if buffer exists
                    if shift_buffer.get(s, 0) > 0:
                        model.Add(shift_count[(n, s)] <= limit)
                        print(f"   {n} {s}: max {limit} (flexible)", flush=True)
                    else:
                        model.Add(shift_count[(n, s)] == limit)
                        print(f"   {n} {s}: exact {limit} (tight)", flush=True)

    # ----------------------------
    # 11. OBJECTIVE: Maximize preferences
    # ----------------------------
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
        model.Maximize(sum(preference_terms) + sum(workload_penalties))
    else:
        model.Maximize(sum(preference_terms))
        
    print("   🎯 Objective: Maximize preference satisfaction and fairness", flush=True)
    print("      (with hard constraints: coverage ✅, logistics ✅)", flush=True)

    # ----------------------------
    # 12. Solve
    # ----------------------------
    
    # Dynamic worker calculation based on buffer flexibility
    num_vars = len(nurses) * days * len(shifts)
    
    if total_buffer > 0:
        # Has flexibility - parallel workers help explore solution space
        if num_vars < 1000:
            workers = 2
        elif num_vars < 5000:
            workers = 4
        else:
            workers = 8
        print(f"🔧 [SOLVER] Buffer={total_buffer} (flexible), using {workers} workers for parallel search", flush=True)
    else:
        # No flexibility - focused single-threaded search
        workers = 1
        print(f"🔧 [SOLVER] Buffer={total_buffer} (tight constraints), using {workers} worker for focused search", flush=True)
    
    print(f"🚀 [SOLVER] Starting solver ({'30.0' if total_buffer == 0 else '15.0'}s timeout, {workers} workers)...", flush=True)
    solver = cp_model.CpSolver()
    # More time for tight constraints (no buffer), less for flexible cases
    solver.parameters.max_time_in_seconds = 30.0 if total_buffer == 0 else 15.0
    solver.parameters.num_search_workers = workers
    solver.parameters.cp_model_presolve = True
    solver.parameters.log_search_progress = False

    status = solver.Solve(model)

    print(f"📊 [SOLVER] Status: {status} (OPTIMAL={cp_model.OPTIMAL}, FEASIBLE={cp_model.FEASIBLE})", flush=True)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print("❌ [SOLVER] No feasible solution found!", flush=True)
        print("   This means coverage, fairness, and constraints are incompatible.", flush=True)
        
        # Two-phase fallback for tight constraints (no buffer)
        if total_buffer == 0:
            print("⚠️ [SOLVER] Attempting two-phase fallback for tight constraints...", flush=True)
            
            # Phase 1: Solve with only hard constraints (no objective)
            print("   Phase 1: Finding feasible solution without preferences...", flush=True)
            model_phase1 = cp_model.CpModel()
            
            # Re-add all hard constraints (simplified - just coverage and logistics)
            X_phase1 = {}
            for n in nurses:
                for d in range(days):
                    for s in shifts:
                        X_phase1[(n, d, s)] = model_phase1.NewBoolVar(f"{n}_{d}_{s}")
            
            # One shift per day
            for n in nurses:
                for d in range(days):
                    model_phase1.Add(sum(X_phase1[(n, d, s)] for s in shifts) <= 1)
            
            # Coverage constraints
            for d in range(days):
                for s in shifts:
                    model_phase1.Add(
                        sum(X_phase1[(n, d, s)] for n in nurses) == coverage[d][s]
                    )
            
            # Consecutive constraints
            for n in nurses:
                for d in range(days - max_nights):
                    model_phase1.Add(
                        sum(X_phase1[(n, d + i, "night")] for i in range(max_nights + 1)) <= max_nights
                    )
                for d in range(days - max_days):
                    model_phase1.Add(
                        sum(X_phase1[(n, d + i, s)] for i in range(max_days + 1) for s in shifts) <= max_days
                    )
            
            # Unavailable nurses
            if unavailable_nurses and unavailable_days:
                for n in unavailable_nurses:
                    for d in unavailable_days:
                        for s in shifts:
                            model_phase1.Add(X_phase1[(n, d, s)] == 0)
            
            # Exact shift counts (the tight constraints)
            for n in nurses:
                nurse_limits = max_shifts_per_type.get(n, {})
                for s in shifts:
                    limit = nurse_limits.get(s, None)
                    if limit is not None:
                        if limit < 0:
                            shift_count_temp = model_phase1.NewIntVar(0, days, f"temp_{n}_{s}")
                            model_phase1.Add(shift_count_temp == sum(X_phase1[(n, d, s)] for d in range(days)))
                            model_phase1.Add(shift_count_temp == 0)
                        else:
                            shift_count_temp = model_phase1.NewIntVar(0, days, f"temp_{n}_{s}")
                            model_phase1.Add(shift_count_temp == sum(X_phase1[(n, d, s)] for d in range(days)))
                            model_phase1.Add(shift_count_temp == limit)
            
            solver_phase1 = cp_model.CpSolver()
            solver_phase1.parameters.max_time_in_seconds = 30.0
            solver_phase1.parameters.num_search_workers = 1
            solver_phase1.parameters.cp_model_presolve = True
            
            status_phase1 = solver_phase1.Solve(model_phase1)
            
            if status_phase1 in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                print("   ✅ Phase 1: Feasible solution found! Using it...", flush=True)
                # Extract solution from phase 1
                roster = {n: [] for n in nurses}
                shift_counts = {s: 0 for s in shifts}
                nurse_workload = {}
                coverage_by_day_shift = {d: {s: 0 for s in shifts} for d in range(days)}
                
                for n in nurses:
                    nurse_shifts = 0
                    for d in range(days):
                        assigned = "off"
                        for s in shifts:
                            if solver_phase1.Value(X_phase1[(n, d, s)]) == 1:
                                assigned = s
                                shift_counts[assigned] = shift_counts.get(assigned, 0) + 1
                                coverage_by_day_shift[d][assigned] += 1
                                nurse_shifts += 1
                        roster[n].append(assigned)
                    nurse_workload[n] = nurse_shifts
                
                return {
                    "success": True,
                    "roster": roster,
                    "workload": nurse_workload,
                    "shift_totals": shift_counts,
                    "required": dict(required_total_per_shift),
                    "preference_score": 0,
                    "note": "Solved with fallback (no preference optimization)"
                }
            else:
                print("   ❌ Phase 1: Still infeasible. Problem may be truly unsolvable.", flush=True)
        
        return {"success": False, "reason": "Conflicting hard constraints - no feasible solution exists"}

    print("✅ [SOLVER] Solution found!", flush=True)

    # ----------------------------
    # 13. Extract result and verify
    # ----------------------------
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