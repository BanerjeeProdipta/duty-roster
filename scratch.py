from ortools.sat.python import cp_model

model = cp_model.CpModel()
days = 5
shifts = ["morning", "evening", "night"]
X = {}
for d in range(days):
    for s in shifts:
        X[(0, d, s)] = model.NewBoolVar(f"0_{d}_{s}")

for d in range(days):
    model.Add(sum(X[(0, d, s)] for s in shifts) <= 1)

# Force nights on day 0, 1, 2
model.Add(X[(0, 0, "night")] == 1)
model.Add(X[(0, 1, "night")] == 1)
model.Add(X[(0, 2, "night")] == 1)

for d in range(days - 2):
    night_on_d = X[(0, d, "night")]
    night_on_d_plus_1 = X[(0, d + 1, "night")]
    any_shift_on_d_plus_2 = sum(X[(0, d + 2, s)] for s in shifts)
    model.Add(night_on_d + night_on_d_plus_1 + any_shift_on_d_plus_2 <= 2)

solver = cp_model.CpSolver()
status = solver.Solve(model)
print(f"Status for 3 nights: {status == cp_model.INFEASIBLE}")

# Test if it allows N N Off N N
model2 = cp_model.CpModel()
X2 = {}
for d in range(days):
    for s in shifts:
        X2[(0, d, s)] = model2.NewBoolVar(f"0_{d}_{s}")
for d in range(days):
    model2.Add(sum(X2[(0, d, s)] for s in shifts) <= 1)

model2.Add(X2[(0, 0, "night")] == 1)
model2.Add(X2[(0, 1, "night")] == 1)
# Day 2 is off automatically?
model2.Add(X2[(0, 3, "night")] == 1)
model2.Add(X2[(0, 4, "night")] == 1)

for d in range(days - 2):
    night_on_d = X2[(0, d, "night")]
    night_on_d_plus_1 = X2[(0, d + 1, "night")]
    any_shift_on_d_plus_2 = sum(X2[(0, d + 2, s)] for s in shifts)
    model2.Add(night_on_d + night_on_d_plus_1 + any_shift_on_d_plus_2 <= 2)

solver2 = cp_model.CpSolver()
status2 = solver2.Solve(model2)
print(f"Status for N N Off N N: {status2 == cp_model.OPTIMAL or status2 == cp_model.FEASIBLE}")
