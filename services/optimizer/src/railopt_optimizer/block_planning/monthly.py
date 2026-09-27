"""Monthly rough-cut plan: which week each pending task goes into.

The weekly plan (service.plan_blocks) places tasks to the minute. The
monthly plan looks further ahead with less detail:

    decision   task -> (week, window of the weekly pattern), or not planned
    capacity   per week, window and section: the train-free minutes of that
               window on that section; tasks placed there may not exceed it
    fit        a task can only use a window where it is a feasible candidate
               (block type, duration incl. setup/release, a train-free gap
               long enough, resources, skills, section status)
    order      a planned successor needs its pending predecessor planned in
               the same or an earlier week
    objective  lexicographic: maximise priority-weighted planned tasks; then
               minimise priority-weighted weeks late against the due date;
               then plan higher-priority work in earlier weeks

Only the first week has block windows, train movements and resource
availability in the dataset. Later weeks are PROJECTED: they repeat the
first week's pattern. This is an assumption, returned in `assumptions`, not
data. Parallel work of different departments on one section (coordination)
is not assumed here, so the capacity is conservative on that side and
optimistic on gap fragmentation; the weekly plan resolves both exactly.
"""

from __future__ import annotations

from collections import Counter
from datetime import date, timedelta
from typing import Any

from ortools.sat.python import cp_model

from railopt_optimizer.block_planning.candidates import generate_candidates, train_free_gaps
from railopt_optimizer.block_planning.model import build_problem

WEEK_DAYS = 7
PRIORITY_SCALE = 10


def _due_week(due: str | None, start: date) -> int | None:
    if not due:
        return None
    return (date.fromisoformat(due[:10]) - start).days // WEEK_DAYS


MONTH_CHECKS = ["TASK_ONCE", "WINDOW_FIT", "WEEK_CAPACITY", "DEPENDENCY_WEEK_ORDER"]


def check_month(
    problem,
    by_task: dict,
    capacity: dict[tuple[str, str], int],
    assignments: list[dict[str, Any]],
    weeks: int,
) -> dict[str, Any]:
    """Re-check a monthly plan without the CP-SAT model."""
    violations = []
    seen: set[str] = set()
    load: Counter = Counter()
    week_of: dict[str, int] = {}
    for row in assignments:
        task_id = row["task_id"]
        if task_id in seen:
            violations.append({"check": "TASK_ONCE", "task_id": task_id, "message": "Planned more than once"})
        seen.add(task_id)
        week_of[task_id] = row["week"]
        option = next((o for o in by_task.get(task_id, []) if o.window_id == row["window_id"]), None)
        if option is None or not 0 <= row["week"] < weeks:
            violations.append(
                {"check": "WINDOW_FIT", "task_id": task_id, "message": f"{row['window_id']} is not a feasible window"}
            )
            continue
        load[(row["window_id"], problem.tasks[task_id].section_id, row["week"])] += option.duration
    for (window_id, section_id, week), minutes in load.items():
        if minutes > capacity.get((window_id, section_id), 0):
            violations.append(
                {
                    "check": "WEEK_CAPACITY",
                    "task_id": "",
                    "message": f"{window_id}/{section_id} week {week + 1}: {minutes} > {capacity.get((window_id, section_id), 0)} min",
                }
            )
    for dependency in problem.dependencies:
        if dependency.successor in week_of and dependency.predecessor in problem.tasks:
            before = week_of.get(dependency.predecessor)
            if before is None or before > week_of[dependency.successor]:
                violations.append(
                    {
                        "check": "DEPENDENCY_WEEK_ORDER",
                        "task_id": dependency.successor,
                        "message": f"Predecessor {dependency.predecessor} not planned in the same or an earlier week",
                    }
                )
    return {"passed": not violations, "checks": MONTH_CHECKS, "violations": violations}


def plan_month(payload: dict[str, Any], weeks: int = 5) -> dict[str, Any]:
    if not 1 <= weeks <= 8:
        raise ValueError("weeks must be between 1 and 8")
    pattern = {**payload, "horizon_days": WEEK_DAYS}
    problem = build_problem(pattern)
    candidates = generate_candidates(problem)
    by_task = candidates.by_task()
    start = date.fromisoformat(payload["horizon_start"])

    # Train-free minutes per (window, section) in the weekly pattern.
    capacity: dict[tuple[str, str], int] = {}
    for window in problem.windows.values():
        if not window.available:
            continue
        for section_id in window.sections:
            capacity[(window.window_id, section_id)] = sum(
                end - begin for begin, end in train_free_gaps(problem, section_id, window)
            )

    model = cp_model.CpModel()
    x: dict[tuple[str, str, int], cp_model.IntVar] = {}
    week_of: dict[str, cp_model.IntVar] = {}
    present: dict[str, cp_model.IntVar] = {}
    load: dict[tuple[str, str, int], list] = {}

    for task_id, options in by_task.items():
        task = problem.tasks[task_id]
        choices = []
        for option in options:
            for week in range(weeks):
                var = model.NewBoolVar(f"x_{task_id}_{option.window_id}_{week}")
                x[(task_id, option.window_id, week)] = var
                choices.append((var, week))
                load.setdefault((option.window_id, task.section_id, week), []).append(
                    (var, option.duration)
                )
        present[task_id] = model.NewBoolVar(f"p_{task_id}")
        model.Add(sum(var for var, _ in choices) == present[task_id])
        week_of[task_id] = model.NewIntVar(0, weeks - 1, f"w_{task_id}")
        model.Add(week_of[task_id] == sum(week * var for var, week in choices)).OnlyEnforceIf(
            present[task_id]
        )
        model.Add(week_of[task_id] == 0).OnlyEnforceIf(present[task_id].Not())

    for (window_id, section_id, _week), items in load.items():
        model.Add(sum(duration * var for var, duration in items) <= capacity.get((window_id, section_id), 0))

    for dependency in problem.dependencies:
        successor = present.get(dependency.successor)
        if successor is None or dependency.predecessor not in problem.tasks:
            continue
        predecessor = present.get(dependency.predecessor)
        if predecessor is None:
            model.Add(successor == 0)
            continue
        model.AddImplication(successor, predecessor)
        model.Add(week_of[dependency.predecessor] <= week_of[dependency.successor]).OnlyEnforceIf(successor)

    weights = {t: int(round(problem.tasks[t].priority_score * PRIORITY_SCALE)) for t in present}
    due_weeks = [
        due for t in present if (due := _due_week(problem.tasks[t].due_date, start)) is not None
    ]
    max_late = max([weeks - 1 - due for due in due_weeks] + [0])
    late_terms, week_terms = [], []
    for task_id, is_present in present.items():
        due = _due_week(problem.tasks[task_id].due_date, start)
        if due is not None:
            late = model.NewIntVar(0, max_late, f"late_{task_id}")
            model.Add(late >= week_of[task_id] - due).OnlyEnforceIf(is_present)
            model.Add(late == 0).OnlyEnforceIf(is_present.Not())
            late_terms.append(weights[task_id] * late)
        week_terms.append(weights[task_id] * week_of[task_id])
    week_bound = sum(weights.values()) * weeks + 1
    late_bound = (sum(weights.values()) * max_late + 1) * week_bound + 1
    model.Maximize(
        late_bound * sum(weights[t] * present[t] for t in present)
        - week_bound * sum(late_terms)
        - sum(week_terms)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(payload.get("time_limit_seconds", 20))
    # Deterministic: the same inputs always give the same monthly plan.
    solver.parameters.num_search_workers = 1
    solver.parameters.random_seed = 0
    status = solver.StatusName(solver.Solve(model))
    solved = status in ("OPTIMAL", "FEASIBLE")

    assignments = []
    if solved:
        for (task_id, window_id, week), var in x.items():
            if solver.Value(var):
                task = problem.tasks[task_id]
                due = _due_week(task.due_date, start)
                assignments.append(
                    {
                        "task_id": task_id,
                        "week": week,
                        "window_id": window_id,
                        "section_id": task.section_id,
                        "department": task.department,
                        "priority_score": task.priority_score,
                        "due_date": task.due_date,
                        "weeks_late": max(0, week - due) if due is not None else 0,
                        "overdue_at_start": due is not None and due < 0,
                    }
                )
    assignments.sort(key=lambda row: (row["week"], -row["priority_score"]))
    planned = {row["task_id"] for row in assignments}

    rejections: dict[str, Counter] = {}
    for rejection in candidates.rejections:
        rejections.setdefault(rejection.task_id, Counter())[rejection.code] += 1
    predecessors: dict[str, list[str]] = {}
    for dependency in problem.dependencies:
        if dependency.predecessor in problem.tasks:
            predecessors.setdefault(dependency.successor, []).append(dependency.predecessor)

    unplanned = []
    for task in sorted(problem.tasks.values(), key=lambda t: -t.priority_score):
        if task.task_id in planned:
            continue
        blocked = [p for p in predecessors.get(task.task_id, []) if p not in planned]
        if task.task_id in by_task and solved and blocked:
            code = "DEPENDENCY_BLOCKED"
            reason = f"Predecessor not planned this month: {', '.join(blocked[:3])}"
        elif task.task_id not in by_task:
            codes = rejections.get(task.task_id, Counter())
            code = codes.most_common(1)[0][0] if codes else "NO_CANDIDATE"
            reason = "No window in the weekly pattern fits: " + ", ".join(
                f"{n}× {c.lower().replace('_', ' ')}" for c, n in codes.most_common()
            ) if codes else "No window in the weekly pattern fits"
        elif not solved:
            code, reason = f"SOLVER_{status}", f"Solver returned {status}"
        else:
            code = "CAPACITY"
            reason = f"Fits a window, but the {weeks}-week capacity went to higher-weight work"
        unplanned.append(
            {
                "task_id": task.task_id,
                "priority_score": task.priority_score,
                "section_id": task.section_id,
                "department": task.department,
                "due_date": task.due_date,
                "reason_code": code,
                "reason": reason,
            }
        )

    # Block requests: work that no window of the weekly pattern can hold,
    # grouped by section, with the block length it would need.
    required: dict[str, int] = {}
    for requirement in problem.requirements:
        minutes = requirement.required_minutes
        required[requirement.task_id] = min(required.get(requirement.task_id, minutes), minutes)
    longest_gap: dict[str, int] = {}
    for (window_id, section_id), _ in capacity.items():
        window = problem.windows[window_id]
        gap = max((end - begin for begin, end in train_free_gaps(problem, section_id, window)), default=0)
        longest_gap[section_id] = max(longest_gap.get(section_id, 0), gap)
    requests: dict[str, dict[str, Any]] = {}
    for row in unplanned:
        if row["reason_code"] not in ("WINDOW_TOO_SHORT", "TRAIN_CONFLICT", "BLOCK_CAPACITY"):
            continue
        entry = requests.setdefault(
            row["section_id"],
            {"section_id": row["section_id"], "tasks": [], "departments": set(), "needed_minutes": 0},
        )
        entry["tasks"].append(row["task_id"])
        entry["departments"].add(row["department"])
        entry["needed_minutes"] = max(entry["needed_minutes"], required.get(row["task_id"], 0))
    block_requests = sorted(
        (
            {
                **entry,
                "departments": sorted(entry["departments"]),
                "task_count": len(entry["tasks"]),
                "longest_train_free_gap_minutes": longest_gap.get(entry["section_id"], 0),
            }
            for entry in requests.values()
        ),
        key=lambda entry: -entry["task_count"],
    )

    week_rows = []
    for week in range(weeks):
        rows = [row for row in assignments if row["week"] == week]
        used: Counter = Counter()
        for row in rows:
            option = next(o for o in by_task[row["task_id"]] if o.window_id == row["window_id"])
            used[row["section_id"]] += option.duration
        cap: Counter = Counter()
        for (_, section_id), minutes in capacity.items():
            cap[section_id] += minutes
        week_start = start + timedelta(days=WEEK_DAYS * week)
        week_rows.append(
            {
                "week": week,
                "start": week_start.isoformat(),
                "end": (week_start + timedelta(days=WEEK_DAYS - 1)).isoformat(),
                "projected": week > 0,
                "tasks": len(rows),
                "by_department": dict(Counter(row["department"] for row in rows)),
                "minutes_used": sum(used.values()),
                "capacity_minutes": sum(cap.values()),
                "sections": {
                    section_id: {"used": used.get(section_id, 0), "capacity": cap[section_id]}
                    for section_id in sorted(cap)
                },
            }
        )

    total_weight = sum(t.priority_score for t in problem.tasks.values())
    planned_weight = sum(problem.tasks[t].priority_score for t in planned)
    p1 = [t for t in problem.tasks.values() if t.priority_score >= problem.p1_threshold]
    overdue = [t for t in problem.tasks.values() if (_due_week(t.due_date, start) or 0) < 0]
    return {
        "planning_date": payload["horizon_start"],
        "weeks": weeks,
        "solver": {
            "status": status,
            "wall_time_seconds": round(solver.WallTime(), 3),
            "variables": len(model.Proto().variables),
            "constraints": len(model.Proto().constraints),
        },
        "kpis": {
            "tasks_considered": len(problem.tasks),
            "tasks_with_candidates": len(by_task),
            "tasks_scheduled": len(planned),
            "priority_weighted_completion_pct": round(100 * planned_weight / total_weight, 1) if total_weight else 0.0,
            "p1_total": len(p1),
            "p1_scheduled": sum(1 for t in p1 if t.task_id in planned),
            "overdue_at_start": len(overdue),
            "overdue_planned": sum(1 for t in overdue if t.task_id in planned),
            "planned_late": sum(1 for row in assignments if row["weeks_late"] > 0),
        },
        "validation": check_month(problem, by_task, capacity, assignments, weeks),
        "week_summary": week_rows,
        "assignments": assignments,
        "unplanned": unplanned,
        "block_requests": block_requests,
        "assumptions": [
            "Only week 1 has block windows, train movements and resource availability in the dataset; "
            "weeks 2+ are projected by repeating the week-1 pattern.",
            "Capacity per week, window and section = train-free minutes of that window on that section.",
            "Rough-cut: no minute-level times, dependency gaps, same-asset sequencing or parallel "
            "department work; the weekly plan resolves these exactly.",
        ],
    }
