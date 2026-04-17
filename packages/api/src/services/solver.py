import sys
import json
import calendar
from ortools.sat.python import cp_model

params = json.loads(sys.argv[1])

YEAR       = params["year"]
MONTH      = params["month"]
HISTORY    = params.get("history", {})
NURSES     = params.get("nurses", 32)

# Total days in full month (needed for monthly off calculation)
TOTAL_DAYS_IN_MONTH = calendar.monthrange(YEAR, MONTH)[1]

START_DAY  = params.get("start_day", 1)
# Clamp END_DAY to the real last day of the month — prevents accidental
# truncation when the caller passes a value like 28 for a 30-day month.
END_DAY    = min(params.get("end_day", TOTAL_DAYS_IN_MONTH), TOTAL_DAYS_IN_MONTH)

SHIFTS = ["morning", "evening", "night"]

DAYS_TO_SOLVE = END_DAY - START_DAY + 1

def is_friday(day):
    return calendar.weekday(YEAR, MONTH, day) == 4

def get_req(day):
    if is_friday(day):
        return {"morning": 3, "evening": 3, "night": 2}
    return {"morning": 20, "evening": 3, "night": 2}


# ───────────── MODEL ─────────────

model = cp_model.CpModel()

x = {}
work = {}

for n in range(NURSES):
    for d in range(DAYS_TO_SOLVE):
        work[n, d] = model.NewBoolVar(f"work_{n}_{d}")
        for s in SHIFTS:
            x[n, d, s] = model.NewBoolVar(f"x_{n}_{d}_{s}")

        shifts = [x[n, d, s] for s in SHIFTS]

        for sv in shifts:
            model.AddImplication(sv, work[n, d])

        model.Add(sum(shifts) >= work[n, d])
        model.Add(sum(shifts) <= len(SHIFTS) * work[n, d])


# ───────────── HARD CONSTRAINTS ─────────────

# Max 1 shift/day
for n in range(NURSES):
    for d in range(DAYS_TO_SOLVE):
        model.AddAtMostOne(x[n, d, s] for s in SHIFTS)


# ───────────── SUPERVISOR (nurse_1) ─────────────

SUPERVISOR = 0

for d in range(DAYS_TO_SOLVE):
    day_num = START_DAY + d

    model.Add(x[SUPERVISOR, d, "evening"] == 0)
    model.Add(x[SUPERVISOR, d, "night"] == 0)

    if is_friday(day_num):
        model.Add(work[SUPERVISOR, d] == 0)
    else:
        model.Add(x[SUPERVISOR, d, "morning"] == 1)


# ───────────── COVERAGE ─────────────

for d in range(DAYS_TO_SOLVE):
    day_num = START_DAY + d
    req = get_req(day_num)

    model.Add(sum(x[n, d, "morning"] for n in range(NURSES)) == req["morning"])
    model.Add(sum(x[n, d, "evening"] for n in range(NURSES)) == req["evening"])
    model.Add(sum(x[n, d, "night"] for n in range(NURSES)) == req["night"])


# ───────────── NIGHT LOGIC ─────────────

for n in range(NURSES):
    hist = HISTORY.get(f"nurse_{n+1}", {})
    last = hist.get("last_shift", "")
    second_last = hist.get("second_last_shift", "")

    # Cross-boundary: if last two shifts were nights, force day off on d=0
    if last == "night" and second_last == "night":
        model.Add(work[n, 0] == 0)

    # Cross-boundary: no two consecutive nights across chunk boundary
    if last == "night" and DAYS_TO_SOLVE >= 2:
        model.Add(x[n, 0, "night"] + x[n, 1, "night"] <= 1)


# ───────────── WEEKLY OFF ─────────────

MAX_CONSEC = 6

for n in range(NURSES):
    hist = HISTORY.get(f"nurse_{n+1}", {})
    prev = hist.get("consecutive_work_days", 0)

    for d in range(DAYS_TO_SOLVE):
        # Cap history slots so total window stays exactly MAX_CONSEC wide
        history_slots = max(0, min(prev, MAX_CONSEC - (d + 1)))

        chunk_window_size = MAX_CONSEC - history_slots
        chunk_vars = [
            work[n, k]
            for k in range(max(0, d - chunk_window_size + 1), d + 1)
        ]

        model.Add(history_slots + sum(chunk_vars) <= MAX_CONSEC)


# ───────────── MINIMUM DAYS OFF ─────────────
#
# Rule: 1 day off per week + 1 extra day off per month
#
# Since we solve in weekly chunks, we enforce:
#   - Per chunk:  at most (chunk_days - 1) work days  → guarantees 1 off/week
#   - Last chunk: subtract the extra monthly day off from the allowance
#
# The extra day off is applied in the LAST chunk only to avoid being
# too restrictive in early chunks (which would cause infeasibility).

is_last_chunk = (END_DAY == TOTAL_DAYS_IN_MONTH)

for n in range(NURSES):
    # 1 day off per week (every chunk)
    weekly_off = 1
    max_work_days = DAYS_TO_SOLVE - weekly_off

    # Extra 1 day off applied only in the final chunk of the month
    if is_last_chunk:
        max_work_days -= 1

    model.Add(sum(work[n, d] for d in range(DAYS_TO_SOLVE)) <= max_work_days)


# ───────────── NIGHT DISTRIBUTION ─────────────
#
# Rule: every nurse (except supervisor) must do EXACTLY 3 nights per month.
# We track nights_so_far from history and enforce both a ceiling and floor
# in every chunk so the running total stays on track for exactly 3.

MONTHLY_NIGHTS = 3

for n in range(NURSES):
    if n == SUPERVISOR:
        model.Add(sum(x[n, d, "night"] for d in range(DAYS_TO_SOLVE)) == 0)
        continue

    hist = HISTORY.get(f"nurse_{n+1}", {})
    nights_so_far = hist.get("month_night_count", 0)

    nights_this_chunk = sum(x[n, d, "night"] for d in range(DAYS_TO_SOLVE))

    # How many nights are still allowed / still needed
    nights_remaining = max(0, MONTHLY_NIGHTS - nights_so_far)

    # UPPER BOUND (every chunk): never exceed the monthly total of 3
    model.Add(nights_this_chunk <= nights_remaining)

    if is_last_chunk:
        # LOWER BOUND (last chunk only): must complete exactly 3 nights total
        model.Add(nights_this_chunk >= nights_remaining)


# ───────────── OBJECTIVE ─────────────

objective = []

for n in range(NURSES):
    for d in range(DAYS_TO_SOLVE):
        objective.append(5 * x[n, d, "morning"])
        objective.append(5 * x[n, d, "evening"])
        objective.append(-2 * x[n, d, "night"])


total_work = []
for n in range(NURSES):
    if n == SUPERVISOR:
        continue

    tw = model.NewIntVar(0, DAYS_TO_SOLVE, f"tw_{n}")
    model.Add(tw == sum(work[n, d] for d in range(DAYS_TO_SOLVE)))
    total_work.append(tw)

max_w = model.NewIntVar(0, DAYS_TO_SOLVE, "max_w")
min_w = model.NewIntVar(0, DAYS_TO_SOLVE, "min_w")

model.AddMaxEquality(max_w, total_work)
model.AddMinEquality(min_w, total_work)

model.Maximize(sum(objective) - 8 * (max_w - min_w))


# ───────────── SOLVE ─────────────

solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 15
solver.parameters.num_search_workers = 8

status = solver.Solve(model)


# ───────────── OUTPUT ─────────────

result = []

if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
    for n in range(NURSES):
        for d in range(DAYS_TO_SOLVE):
            for s in SHIFTS:
                if solver.Value(x[n, d, s]):
                    result.append({
                        "nurseId": f"nurse_{n+1}",
                        "day": START_DAY + d,
                        "shift": s
                    })

print(json.dumps({
    "status": solver.StatusName(status),
    "schedules": result
}))