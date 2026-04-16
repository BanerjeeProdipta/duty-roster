import sys
import json
import calendar
from ortools.sat.python import cp_model

params = json.loads(sys.argv[1])

YEAR = params["year"]
MONTH = params["month"]

NURSES = 32
SHIFTS = ["morning", "evening", "night"]

# ---------------- REAL CALENDAR ----------------
DAYS = calendar.monthrange(YEAR, MONTH)[1]

def is_friday(day):
    return (calendar.weekday(YEAR, MONTH, day) == 4)


def get_req(day):
    if is_friday(day):
        return {"morning": 3, "evening": 3, "night": 2}
    return {"morning": 20, "evening": 3, "night": 2}


# ---------------- MODEL ----------------
model = cp_model.CpModel()

x = {}

for n in range(NURSES):
    for d in range(DAYS):
        for s in SHIFTS:
            x[n, d, s] = model.NewBoolVar(f"x_{n}_{d}_{s}")


# ---------------- HARD CONSTRAINTS ----------------

# shift coverage
for d in range(DAYS):
    req = get_req(d + 1)

    for s in SHIFTS:
        model.Add(
            sum(x[n, d, s] for n in range(NURSES)) == req[s]
        )

# one shift per nurse per day
for n in range(NURSES):
    for d in range(DAYS):
        model.Add(
            sum(x[n, d, s] for s in SHIFTS) <= 1
        )

# night limit
for n in range(NURSES):
    model.Add(
        sum(x[n, d, "night"] for d in range(DAYS)) <= 3
    )


# ---------------- OBJECTIVE ----------------

objective = []

for n in range(NURSES):
    for d in range(DAYS):
        objective.append(-2 * x[n, d, "morning"])
        objective.append(-2 * x[n, d, "evening"])

        if is_friday(d + 1):
            objective.append(2 * x[n, d, "night"])

model.Minimize(sum(objective))


solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 10

status = solver.Solve(model)

result = []

if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
    for n in range(NURSES):
        for d in range(DAYS):
            for s in SHIFTS:
                if solver.Value(x[n, d, s]) == 1:
                    result.append({
                        "nurseId": f"nurse_{n+1}",
                        "day": d + 1,
                        "shift": s
                    })

print(json.dumps({"schedules": result}))