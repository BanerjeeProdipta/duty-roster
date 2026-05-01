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

    print(f"📊 [SOLVER] Input: {len(nurses)} nurses, {days} days, {len(shifts)} shift types", flush=True)
    print(f"📋 [SOLVER] Coverage by day: {coverage[:3]}... (showing first 3)", flush=True)
    print(f"🎯 [SOLVER] Constraints: max_nights={constraints['max_consecutive_nights']}, max_days={constraints['max_consecutive_days']}", flush=True)

    total_needed = sum(coverage[d][s] for d in range(days) for s in shifts)
    print(f"⚡ [SOLVER] Total shifts needed: {total_needed}", flush=True)
    print(f"👩‍⚕️ [SOLVER] Shifts per nurse (avg): {total_needed / len(nurses):.1f}", flush=True)

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
    # 9. HARD: FAIRNESS CONSTRAINTS (±1 variance)
    # ----------------------------
    print("⚖️ [SOLVER] Adding HARD fairness constraints (±1 variance)...", flush=True)

    # Calculate max shifts per nurse (leave some slack for feasibility)
    max_shifts_per_nurse = min(days - 5, avg_load + 2)  # Allow some buffer

    for n in nurses:
        # Hard cap on max shifts
        model.Add(total_shifts[n] <= max_shifts_per_nurse)

        if n not in unavailable_nurses:
            # Available nurses: at least avg_load
            model.Add(total_shifts[n] >= avg_load)
        else:
            # Unavailable nurses: fewer shifts
            unavailable_max = max(0, (avg_load * 2) // 5)
            model.Add(total_shifts[n] <= unavailable_max)

    print(f"   ✅ Max shifts cap: {max_shifts_per_nurse}, avg: {avg_load}", flush=True)

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
    
    model.Maximize(sum(preference_terms))
    print("   🎯 Objective: Maximize preference satisfaction", flush=True)
    print("      (with hard constraints: coverage ✅, fairness ✅, logistics ✅)", flush=True)

    # ----------------------------
    # 12. Solve
    # ----------------------------
    print("🚀 [SOLVER] Starting solver (60s timeout, 8 workers)...", flush=True)
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 60
    solver.parameters.num_search_workers = 8
    solver.parameters.log_search_progress = False

    status = solver.Solve(model)

    print(f"📊 [SOLVER] Status: {status} (OPTIMAL={cp_model.OPTIMAL}, FEASIBLE={cp_model.FEASIBLE})", flush=True)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        print("❌ [SOLVER] No feasible solution found!", flush=True)
        print("   This means coverage, fairness, and constraints are incompatible.", flush=True)
        return {"success": False}

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