# Duty Roster Solver

## Overview

This is a **Constraint Programming (CP) solver** that assigns nurses to shifts while satisfying coverage, fairness, and rest constraints for our nurse duty roster system.

---

## SETUP & INPUT PARSING (Lines 1-51)

### Lines 1-5: Imports

```python
import json
import sys
from ortools.sat.python import cp_model
```

- `json`: Read problem data as JSON from stdin
- `sys`: Read from command line input
- `cp_model`: Google OR-Tools constraint programming solver (solves complex optimization problems)

### Lines 8-14: Extract Input Data

```python
nurses = data["nurses"]                    # List of nurse names
days = data["days"]                        # Number of days to schedule
shifts = data["shifts"]                    # List of shift types (e.g., ["morning", "evening", "night"])
preferences = data["preferences"]          # Dict: preference weight (0-100) per shift per nurse
coverage = data["coverage"]                # Dict: how many nurses needed per shift per day
constraints = data["constraints"]          # Dict: rules like max consecutive nights
max_shifts_per_type = data.get("max_shifts_per_type", {})  # Nurse limits per shift type
```

**In plain English:**

- `nurses` = ["Alice", "Bob", "Carol"]
- `days` = 30
- `shifts` = ["morning", "evening", "night"]
- `preferences` = {"Alice": {"morning": 80, "evening": 20, "night": 10}, ...} (Alice prefers morning shifts)
- `coverage[5]["night"]` = 2 (On day 5, need 2 nurses on night shift)
- Weekday coverage: morning=20, evening=3, night=2
- Friday coverage: morning=3, evening=3, night=2

---

## BUFFER ANALYSIS (Lines 53-76)

### What's a "buffer"?

**Formula:** `buffer = total_preferred - total_required`

- **Required**: Sum of all coverage needs (hard constraint)
- **Preferred**: Sum of all nurse shift limits (soft constraint)
- **Buffer**: Extra capacity available

**In words:**
"If we need 100 total shifts but nurses can work up to 120 shifts, buffer = 20"

### Lines 60-68: Loop Through Each Shift Type

```python
for s in shifts:
    total_required = sum(coverage[d][s] for d in range(days))
    # Sum coverage for shift 's' across all days
    # Formula: required_s = Σ(d=0 to days) coverage[d][s]

    total_preferred = sum(max(0, max_shifts_per_type.get(n, {}).get(s, days)) for n in nurses)
    # Sum all nurses' limits for shift 's'
    # Formula: preferred_s = Σ(n in nurses) max_shifts_s(n)

    buffer = total_preferred - total_required
    # Formula: buffer_s = preferred_s - required_s
```

**Example calculation:**

```
Shift type: "night"
Days 0-29, coverage = [2, 2, 2, 2, 2, ...] nurses needed per day (2 on weekdays, 2 on Fridays)
Required = 2 × 30 = 60 nights needed total

Each nurse can work up to 3 nights max
30 nurses × 3 nights = 90 nights available
Buffer = 90 - 60 = 30 (flexible, use MAX constraint)
```

**Real coverage values:**

- Weekday: morning=20, evening=3, night=2
- Friday: morning=3, evening=3, night=2

### Lines 70-73: Choose Constraint Type

```python
if buffer > 0:
    use_exact_constraints = False  # Use <= (MAX constraint)
else:
    use_exact_constraints = True   # Use == (EXACT constraint)
```

**Why?**

- **Buffer > 0**: We have spare capacity → constraint is `shifts_of_type(s) <= required_s`
- **Buffer = 0**: Tight fit → constraint is `shifts_of_type(s) == required_s` (exact match needed)

---

## FEASIBILITY CHECK (Lines 84-115)

### Formula: Check Total Capacity

```python
max_shifts_per_nurse = days - (min_days_off_per_week * (days // 7))
```

**In words:** "Maximum shifts one nurse can work = total days - mandatory days off"

**Business context:** Our `ROSTER_CONFIG.CONSTRAINTS.MIN_DAYS_OFF_PER_WEEK = 1`

**Example:**

- 30-day month, minimum 1 day off per week
- 30 days ÷ 7 = 4 weeks
- Max shifts = 30 - (1 × 4) = 26 shifts per nurse
- With 20 active nurses: total capacity = 20 × 26 = 520 shifts
- Required shifts (from coverage): ~614 (see earlier example)
- Note: Capacity check is per-shift-type in our solver

### Formula: Total Capacity

```python
total_capacity = len(nurses) * max_shifts_per_nurse
# Formula: capacity_total = N_nurses × max_shifts_per_nurse
```

**Example:**

- 10 nurses × 26 max shifts = 260 total capacity
- If we need 240 shifts: feasible ✅
- If we need 270 shifts: infeasible ❌

### Lines 99-107: Per-Shift Feasibility

```python
for s in shifts:
    total_required = sum(coverage[d][s] for d in range(days))
    total_max = sum(max(0, max_shifts_per_type.get(n, {}).get(s, days)) for n in nurses)
    if total_max < total_required:
        return {"success": False}
```

**Formula:** For each shift type, check:

```
max_capacity_s = Σ(n in nurses) limit_s(n)
If max_capacity_s < required_s → INFEASIBLE
```

**Example:**

```
Shift: "night"
Required nights = 40
All nurses can do at most: 5×8 + 3×10 + 2×5 = 80 nights
80 >= 40 ✅ FEASIBLE
```

---

## MODEL CREATION (Lines 117-120)

### Line 119:

```python
model = cp_model.CpModel()
```

**In words:** "Create a blank constraint programming model (empty optimization problem)"

---

## DECISION VARIABLES (Lines 122-127)

### Lines 124-126:

```python
for n in nurses:
    for d in range(days):
        for s in shifts:
            X[(n, d, s)] = model.NewBoolVar(f"{n}_{d}_{s}")
```

**Formula:** Create binary variable:

```
X[n, d, s] ∈ {0, 1}
where:
  X[n, d, s] = 1  ↔  Nurse 'n' works shift 's' on day 'd'
  X[n, d, s] = 0  ↔  Nurse 'n' does NOT work that shift
```

**Total variables created:**

```
Total = |nurses| × days × |shifts|
Example: 10 nurses × 30 days × 2 shifts = 600 variables
```

---

## CONSTRAINT 1: ONE SHIFT PER DAY (Lines 129-133)

### Lines 131-132:

```python
for n in nurses:
    for d in range(days):
        model.Add(sum(X[(n, d, s)] for s in shifts) <= 1)
```

**Formula:**

```
Σ(s in shifts) X[n, d, s] ≤ 1
```

**In words:**
"For each nurse on each day, the sum of all shift assignments ≤ 1"

**Meaning:**

- If shifts = ["morning", "evening", "night"], then:
  - X[Alice, day0, morning] + X[Alice, day0, evening] + X[Alice, day0, night] ≤ 1
  - Alice can work at most 1 shift (or be off)
  - She can't work both morning AND night on same day

**Why <= instead of ==?**

- `off` is not counted as a shift variable (stored as null in NurseSchedule)
- If no shift assigned, she's implicitly off

---

## CONSTRAINT 2: HARD COVERAGE (Lines 135-142)

### Lines 138-141:

```python
for d in range(days):
    for s in shifts:
        model.Add(
            sum(X[(n, d, s)] for n in nurses)
            == coverage[d][s]
        )
```

**Formula:**

```
Σ(n in nurses) X[n, d, s] = coverage[d][s]
```

**In words:**
"For each day and shift type, exactly the required number of nurses must be assigned"

**Example:**

```
Day 5, Night shift needs 2 nurses
X[Alice, 5, night] + X[Bob, 5, night] + X[Carol, 5, night] + X[Dave, 5, night] = 2
```

This is a **HARD constraint** (must be satisfied or solution fails)

**Real coverage example:**

```
Weekday: morning=20, evening=3, night=2
Friday: morning=3, evening=3, night=2
```

---

## CONSTRAINT 3: MANDATORY REST AFTER 2 CONSECUTIVE NIGHTS (Lines 144-187)

This is the most complex constraint. It prevents nurse burnout and enforces the Night-Night-Off (NNO) pattern.

### The Rule:

**If a nurse works night shift (20:00-8:00, crosses midnight) on day d AND day d+1, they MUST be off on day d+2**

This is a **hard constraint** in our business logic (see `ROSTER_CONFIG.CONSTRAINTS.MAX_CONSECUTIVE_NIGHTS = 2`).

### Line 159-164: Handle Month Boundaries

```python
prev = previous_shifts.get(n, ["off", "off"])
prev_minus_2 = 1 if prev[0] == "night" else 0
prev_minus_1 = 1 if prev[1] == "night" else 0
```

**Why?**

- Schedule might start mid-pattern
- If previous month ended: Night, Night, then day 0 MUST be off
- Convert shift names to binary: night=1, other=0

### Lines 166-169: Cross-Month Check

```python
if prev_minus_2 and prev_minus_1 and days > 0:
    model.Add(sum(X[(n, 0, s)] for s in shifts) == 0)
```

**Formula:**

```
If prev[0] = "night" AND prev[1] = "night"
Then: Σ(s in shifts) X[n, 0, s] = 0
```

**In words:**
"If last 2 days of previous month were nights, day 0 must be off"

### Lines 171-175: Pattern Enforcement

```python
if prev_minus_1 and days > 1:
    night_on_0 = X[(n, 0, "night")]
    any_shift_on_1 = sum(X[(n, 1, s)] for s in shifts)
    model.Add(night_on_0 + any_shift_on_1 <= 1)
```

**Formula:**

```
If prev[-1] = "night" AND X[n, 0, night] = 1
Then: X[n, 0, night] + Σ(s) X[n, 1, s] ≤ 1
```

**In words:**
"If yesterday was night and today is night, tomorrow must be off"

### Lines 178-182: Main Consecutive Night Rule

```python
for d in range(days - 2):
    night_on_d = X[(n, d, "night")]
    night_on_d_plus_1 = X[(n, d + 1, "night")]
    any_shift_on_d_plus_2 = sum(X[(n, d + 2, s)] for s in shifts)
    model.Add(night_on_d + night_on_d_plus_1 + any_shift_on_d_plus_2 <= 2)
```

**Formula:**

```
X[n, d, night] + X[n, d+1, night] + Σ(s) X[n, d+2, s] ≤ 2
```

**In words:**
"Sum of (night on day d) + (night on day d+1) + (any shift on day d+2) ≤ 2"

**What does this prevent?**

```
Case 1: night + night + day = 1 + 1 + 1 = 3 > 2 ❌ BLOCKED
Case 2: night + night + off = 1 + 1 + 0 = 2 ≤ 2 ✅ ALLOWED
Case 3: night + off + night = 1 + 0 + 1 = 2 ≤ 2 ✅ ALLOWED
Case 4: off + night + night = 0 + 1 + 1 = 2 ≤ 2 ✅ ALLOWED
```

**Natural pattern:** This forces NNO (Night-Night-Off)

**Business context:** Our `ROSTER_CONFIG` enforces max 2 consecutive nights with mandatory rest after. This constraint implements that rule.

---

## CONSTRAINT 4: UNAVAILABLE NURSES - FRIDAY REST DAY (Lines 189-198)

### Lines 194-198:

```python
for n in unavailable_nurses:
    for d in unavailable_days:
        for s in shifts:
            model.Add(X[(n, d, s)] == 0)
```

**Formula:**

```
For all n ∈ FRIDAY_OFF_NURSES and d ∈ Fridays of the month:
X[n, d, s] = 0 for all s in shifts (morning, evening, night)
```

**In words:**
"Block nurses who have Friday rest day from working on Fridays"

**Business context:**
Our `ROSTER_CONFIG` defines `FRIDAY_OFF_NURSES` - certain nurses are unavailable on Fridays. This is a hard constraint.

**Example:**

```
Nurse Alice is in FRIDAY_OFF_NURSES
Friday falls on day 5, 12, 19, 26
X[Alice, 5, morning] = 0
X[Alice, 5, evening] = 0
X[Alice, 5, night] = 0
(Alice is implicitly off on those days)
```

---

## WORKLOAD TRACKING (Lines 200-225)

### Lines 202-207: Total Shifts Per Nurse

```python
for n in nurses:
    total_shifts[n] = model.NewIntVar(0, days, f"total_{n}")
    model.Add(
        total_shifts[n] ==
        sum(X[(n, d, s)] for d in range(days) for s in shifts)
    )
```

**Formula:**

```
total_shifts[n] = Σ(d in days, s in shifts) X[n, d, s]
```

**In words:**
"Count total shifts for each nurse (for fairness checking)"

### Lines 209-216: Calculate Fair Load

```python
total_required = sum(coverage[d][s] for d in range(days) for s in shifts)
avg_load = total_required // len(available_nurses)
remainder = total_required % len(available_nurses)
```

**Formula:**

```
avg_load = ⌊ total_required ÷ |nurses| ⌋
remainder = total_required mod |nurses|
```

**Example (using real coverage):**

```
Total shifts needed in 30-day month:
- Morning: 20 × 22 weekdays + 3 × 8 Fridays = 440 + 24 = 464
- Evening: 3 × 22 + 3 × 8 = 66 + 24 = 90
- Night: 2 × 30 = 60
Total = 614 shifts

Nurses available: 20 active nurses
avg_load = 614 ÷ 20 = 30 shifts per nurse
remainder = 614 mod 20 = 14 (so 14 nurses get 31 shifts, 6 get 30)
```

### Lines 220-225: Workload Balancing (Soft Constraint)

```python
for n in available_nurses:
    dev = model.NewIntVar(0, days, f"dev_{n}")
    model.Add(dev >= total_shifts[n] - avg_load)
    model.Add(dev >= avg_load - total_shifts[n])
    workload_penalties.append(-200 * dev)
```

**Formula:**

```
dev[n] = |total_shifts[n] - avg_load|
penalty[n] = -200 × dev[n]
```

**In words:**
"Measure deviation from average. Penalize large deviations by -200 points per shift"

**Example:**

```
Alice assigned 18 shifts, avg = 14
dev[Alice] = |18 - 14| = 4
penalty[Alice] = -200 × 4 = -800 points (bad!)

Bob assigned 15 shifts, avg = 14
dev[Bob] = |15 - 14| = 1
penalty[Bob] = -200 × 1 = -200 points (better)
```

---

## SHIFT TYPE TRACKING (Lines 227-234)

### Lines 229-233:

```python
for n in nurses:
    for s in shifts:
        shift_count[(n, s)] = model.NewIntVar(0, days, f"{n}_{s}_count")
        model.Add(
            shift_count[(n, s)] ==
            sum(X[(n, d, s)] for d in range(days))
        )
```

**Formula:**

```
shift_count[n, s] = Σ(d in days) X[n, d, s]
```

**In words:**
"Count how many times each nurse works each shift type"

**Example:**

```
shift_count[Alice, night] = count of all days where Alice works night
shift_count[Alice, day] = count of all days where Alice works day
```

---

## CONSECUTIVE NIGHT PAIRS (Lines 243-254)

### Lines 246-251: Track Consecutive Nights

```python
for n in nurses:
    for d in range(days - 1):
        consec_night[(n, d)] = model.NewBoolVar(f"{n}_{d}_consec_night")
        night_d = X[(n, d, "night")]
        night_d_plus_1 = X[(n, d + 1, "night")]
        model.Add(consec_night[(n, d)] <= night_d)
        model.Add(consec_night[(n, d)] <= night_d_plus_1)
        model.Add(consec_night[(n, d)] >= night_d + night_d_plus_1 - 1)
```

**Formula:**

```
consec_night[n, d] = 1  ⟺  (night[n, d] = 1 AND night[n, d+1] = 1)
```

**How the constraints work together:**

```
Line 1: consec_night[n, d] ≤ night_d
        (if consecutive nights, must be night on day d)

Line 2: consec_night[n, d] ≤ night_d_plus_1
        (if consecutive nights, must be night on day d+1)

Line 3: consec_night[n, d] ≥ night_d + night_d_plus_1 - 1
        (if both night days, FORCE consecutive_night = 1)
```

**Logic table:**

```
night_d | night_d+1 | consec_night
--------|-----------|-------------
   0    |     0     |    0 (max of constraints 1,2 = 0)
   0    |     1     |    0 (constraint 1: 0 ≤ 0)
   1    |     0     |    0 (constraint 2: 0 ≤ 0)
   1    |     1     |    1 (constraint 3: 1 ≥ 1+1-1 = 1)
```

### Lines 253-256: Count Consecutive Night Pairs

```python
for n in nurses:
    consec_night_count[n] = model.NewIntVar(0, days, f"{n}_consec_night_count")
    model.Add(consec_night_count[n] == sum(consec_night[(n, d)] for d in range(days - 1)))
```

**Formula:**

```
consec_night_count[n] = Σ(d in 0 to days-2) consec_night[n, d]
```

**In words:**
"Count total consecutive night pairs for each nurse"

**Example:**

```
Nurse schedule: [night, night, off, morning, off, evening, night, night, night, ...]
Consecutive pairs:
- Days 0-1: night-night ✓ (pair 1)
- Days 3-4: morning-off ✗
- Days 6-7: night-night ✓ (pair 2)
- Days 7-8: night-night ✓ (pair 3)
Total: 3 pairs
```

**Business context:** We reward consecutive night pairs (+100 points) to encourage the NNO pattern.

---

## SHIFT LIMITS PER NURSE (Lines 270-277)

### Lines 273-277:

```python
for n in nurses:
    nurse_limits = max_shifts_per_type.get(n, {})
    for s in shifts:
        limit = nurse_limits.get(s, None)
        if limit is not None:
            if limit < 0:
                model.Add(shift_count[(n, s)] == 0)
            else:
                model.Add(shift_count[(n, s)] <= limit)
```

**Formula:**

```
If max_shifts_per_type[n][s] = L:
  Case 1: L < 0  ⟹  shift_count[n, s] = 0     (forbidden)
  Case 2: L ≥ 0  ⟹  shift_count[n, s] ≤ L    (limited)
```

**Example:**

```
Alice prefers morning (weight=80), evening (weight=20), night (weight=10)
max_shifts_per_type[Alice] = {morning: 24, evening: 6, night: 3}
(calculated as: round((weight/100) × daysInMonth))

Constraint 1: shift_count[Alice, morning] ≤ 24
Constraint 2: shift_count[Alice, evening] ≤ 6
Constraint 3: shift_count[Alice, night] ≤ 3
```

**Business context:** Max shifts are derived from preference weights using: `max_shifts = round((weight/100) × daysInMonth)`

---

## OBJECTIVE FUNCTION (Lines 279-296)

### Lines 282-285: Preference Terms

```python
preference_terms = []
for n in nurses:
    for d in range(days):
        for s in shifts:
            w = preferences.get(n, {}).get(s, 0)
            if w > 0:
                preference_terms.append(w * X[(n, d, s)])
```

**Formula:**

```
preference_score = Σ(n in nurses, d in days, s in shifts) weight[n, s] × X[n, d, s]
```

**Example:**

```
Alice prefers morning shifts (weight=80)
If Alice works morning shift on day 5: add 80 points
If Alice works night shift on day 3: add 10 points (weight=10)
```

### Lines 291-293: Complete Objective

```python
model.Maximize(
    sum(preference_terms)
    + sum(workload_penalties)
    + sum(nno_rewards)
)
```

**Formula:**

```
Maximize: Σ preference_score - 200 × Σ |deviation| + 100 × Σ consecutive_pairs
```

**In words:**
"Maximize: nurse preference satisfaction + workload fairness + NNO pattern encouragement"

**Priority (by coefficient):**

```
100 (nno_rewards)        ← Encourage Night-Night-Off pattern
preference_terms (varies) ← Satisfy nurse preferences (weight 0-100 per shift type)
-200 (penalties)         ← Minimize workload imbalance (hard constraint)
```

**Business context:** Preference weights are normalized using the fair share algorithm: `weight = ceil((ceil(requirement/nurses) / totalDays) × 100)`

---

## SOLVER CONFIGURATION (Lines 298-312)

### Lines 299-302: Choose Worker Count

```python
if total_buffer > 0:
    workers = 2 if num_vars < 1000 else (4 if num_vars < 5000 else 8)
else:
    workers = 1
```

**Logic:**

- **Buffer > 0** (flexible): Use multiple workers for parallel search
- **Buffer = 0** (tight): Use 1 worker for focused search

### Lines 307-312: Solver Parameters

```python
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 10.0 if total_buffer == 0 else 5.0
solver.parameters.num_search_workers = workers
solver.parameters.cp_model_presolve = True
solver.parameters.log_search_progress = False
```

**Parameters:**

- `max_time_in_seconds`: Timeout (10s for tight, 5s for loose)
- `num_search_workers`: Parallel search threads
- `cp_model_presolve`: Simplify model before solving
- `log_search_progress`: Suppress logging

### Line 314:

```python
status = solver.Solve(model)
```

**In words:**
"Run the solver and get result status (OPTIMAL, FEASIBLE, or INFEASIBLE)"

---

## RESULT EXTRACTION (Lines 324-351)

### Lines 328-340: Build Roster

```python
for n in nurses:
    nurse_shifts = 0
    for d in range(days):
        assigned = "off"
        for s in shifts:
            if solver.Value(X[(n, d, s)]) == 1:
                assigned = s
                shift_counts[assigned] += 1
                coverage_by_day_shift[d][assigned] += 1
                nurse_shifts += 1
        roster[n].append(assigned)
    nurse_workload[n] = nurse_shifts
```

**Logic:**

- Loop through each nurse and day
- Find which shift was assigned (X = 1)
- Record in roster
- Count shift totals and coverage
- Track workload

**Result:**

```
roster[Alice] = ["night", "night", "off", "morning", "off", ...]
nurse_workload[Alice] = 12 (total shifts)
```

**Database mapping:** The roster is persisted to the `nurse_schedule` table where each assignment is a record with `nurseId`, `date`, and `shiftId` (null for off days).

### Lines 342-352: Verify Results

```python
print(f"   {s.upper():7s}: {actual:3d} / {required:3d}")
```

**Checks:**

- Total shifts per type match requirements
- Daily coverage requirements met
- Workload fairness (±1 from average)
- Preference score achieved

---

## RETURN VALUE

### Lines 369-377:

```python
return {
    "success": True,
    "roster": roster,                    # Schedule for each nurse
    "workload": nurse_workload,          # Total shifts per nurse
    "shift_totals": shift_counts,        # Total shifts per type
    "required": dict(required_total_per_shift),  # Requirements
    "preference_score": pref_score       # Satisfaction achieved
}
```

---

## SUMMARY OF ALL FORMULAS

| Concept          | Formula                                          | Meaning                                                                                             |
| ---------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Buffer           | `buffer = Σ preferred - Σ required`              | Extra capacity                                                                                      |
| Capacity         | `capacity = N_nurses × max_shifts`               | Total possible shifts                                                                               |
| One shift/day    | `Σ(s) X[n,d,s] ≤ 1`                              | At most 1 shift (morning/evening/night)                                                             |
| Coverage         | `Σ(n) X[n,d,s] = coverage[d,s]`                  | Exact staff needed (weekday: morning=20, evening=3, night=2; Friday: morning=3, evening=3, night=2) |
| Rest rule        | `night[d] + night[d+1] + any[d+2] ≤ 2`           | Max 2 consec nights, then mandatory off (NNO pattern)                                               |
| Total shifts     | `total[n] = Σ(d,s) X[n,d,s]`                     | Workload counting                                                                                   |
| Workload dev     | `dev[n] = \|total[n] - avg\|`                    | Fairness measure                                                                                    |
| Consecutive pair | `consec[n,d] = night[d] ∧ night[d+1]`            | AND logic (rewarded +100)                                                                           |
| Preference       | `score = Σ weight[n,s] × X[n,d,s]`               | Satisfaction (weight 0-100 per shift type)                                                          |
| Objective        | `Maximize: pref - 200×dev + 100×consec`          | Win: nurse satisfaction + fairness + NNO pattern                                                    |
| Fair share       | `weight = ceil((ceil(req/nurses) / days) × 100)` | Min percentage to meet coverage                                                                     |
