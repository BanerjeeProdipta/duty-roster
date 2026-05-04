# Duty Roster - Business Logic

## Purpose

Automated nurse duty roster scheduling system that generates optimal monthly schedules using constraint programming (OR-Tools).

## Domain Entities

- **Nurse**: Staff member (active flag controls scheduling)
- **Shift**: morning/evening/night with timing info
- **NurseSchedule**: Assignment record (nurse + date + shift, null shift = day off)
- **NurseShiftPreference**: Weight (0-100) per nurse per shift type

## Coverage Requirements

| Day Type | Morning | Evening | Night |
| -------- | ------- | ------- | ----- |
| Weekday  | 20      | 3       | 2     |
| Friday   | 3       | 3       | 2     |

## Hard Constraints (Must Satisfy)

1. One shift per nurse per day (or off)
2. Exact daily coverage per shift must be met
3. Max 2 consecutive night shifts
4. Mandatory rest after 2 nights (Night-Night-Off pattern)
5. Certain nurses unavailable on Fridays
6. Max shifts per type cannot exceed preferred maximum
7. Encourage Night-Night-Off pattern for 2-night nurses

## Soft Constraints (Optimization Goals)

1. Maximize preference satisfaction (weight × assignment)
2. Workload balancing (penalize deviation from average)

## Solver Algorithm (OR-Tools CP-SAT)

- **Variables**: Boolean X[nurse, day, shift]
- **Objective**: Maximize Σ(preference_weight × X) - 200 × |workload - avg|
- **Timeout**: 15-30 seconds
- **Preference normalization**: weights ≤ 100%, day counts = round((weight/100) × daysInMonth)

## Fair Share Algorithm

Calculates minimum percentage weights to meet coverage:
`weight = ceil((ceil(requirement/nurses) / totalDays) × 100)`
Ensures total weights ≤ 99% to preserve off days.

## Data Flow

1. Admin clicks Generate → Build solver payload (nurses, coverage, preferences, constraints)
2. Python solver finds optimal assignment → Returns roster matrix
3. Delete existing month schedules → Bulk insert new assignments
4. UI refreshes with updated roster and metrics
