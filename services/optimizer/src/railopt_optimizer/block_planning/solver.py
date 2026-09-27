"""CP-SAT block planner: assign pending tasks to block windows.

Decision variables
    x[t, w]      task t is placed in candidate window w
    start[t, w]  start minute of t inside w (optional interval)

Hard constraints
    1. each task is placed at most once
    2. the task interval lies inside its window
    3. work on a section never overlaps a train movement on that section
    4. at most one task at a time per section (conservative until a
       compatibility engine allows sharing)
    5. mandatory resources: cumulative demand <= capacity
    6. mandatory finish-to-start dependencies between pending tasks: a
       successor is placed only if its predecessor is, and starts at least
       the minimum gap after the predecessor ends

Objective
    lexicographic: first maximise sum(priority weight of placed tasks); then,
    among plans with the same placed weight, minimise sum(weight * start) so
    higher-priority work starts earlier.
"""

from __future__ import annotations

from dataclasses import dataclass

from ortools.sat.python import cp_model

from railopt_optimizer.block_planning.candidates import CandidateResult
from railopt_optimizer.block_planning.model import PlanningProblem, merge_occupations

PRIORITY_SCALE = 10  # priority score 96.4 -> weight 964


@dataclass(frozen=True)
class Assignment:
    task_id: str
    window_id: str
    start: int
    end: int


@dataclass
class SolveResult:
    status: str
    wall_time: float
    objective: float | None
    assignments: list[Assignment]
    variables: int
    constraints: int


def solve(
    problem: PlanningProblem,
    candidates: CandidateResult,
    time_limit_seconds: float = 20.0,
    workers: int = 8,
) -> SolveResult:
    model = cp_model.CpModel()
    by_task = candidates.by_task()

    placed: dict[tuple[str, str], cp_model.IntVar] = {}
    starts: dict[tuple[str, str], cp_model.IntVar] = {}
    intervals_by_section: dict[str, list] = {}
    demands_by_resource: dict[str, list[tuple]] = {}

    task_present: dict[str, cp_model.IntVar] = {}
    task_start: dict[str, cp_model.IntVar] = {}
    task_end: dict[str, cp_model.IntVar] = {}

    for task_id, options in by_task.items():
        task = problem.tasks[task_id]
        present = model.NewBoolVar(f"present_{task_id}")
        t_start = model.NewIntVar(0, problem.horizon_end, f"start_{task_id}")
        t_end = model.NewIntVar(0, problem.horizon_end + 24 * 60, f"end_{task_id}")
        task_present[task_id], task_start[task_id], task_end[task_id] = present, t_start, t_end

        choices = []
        for option in options:
            window = problem.windows[option.window_id]
            key = (task_id, window.window_id)
            x = model.NewBoolVar(f"x_{task_id}_{window.window_id}")
            s = model.NewIntVar(window.start, window.end - option.duration, f"s_{task_id}_{window.window_id}")
            interval = model.NewOptionalFixedSizeIntervalVar(
                s, option.duration, x, f"i_{task_id}_{window.window_id}"
            )
            placed[key], starts[key] = x, s
            choices.append(x)

            model.Add(t_start == s).OnlyEnforceIf(x)
            model.Add(t_end == s + option.duration).OnlyEnforceIf(x)

            intervals_by_section.setdefault(task.section_id, []).append(interval)
            for need in problem.needs.get(task_id, []):
                demands_by_resource.setdefault(need.resource_id, []).append(
                    (interval, need.quantity)
                )

        # (1) at most once; present iff one window chosen
        model.Add(sum(choices) == present)
        model.Add(t_start == 0).OnlyEnforceIf(present.Not())
        model.Add(t_end == 0).OnlyEnforceIf(present.Not())

    # (3) + (4) section occupancy: tasks and trains on a section never overlap.
    # Trains may overlap each other (multi-track sections), so their
    # occupations are merged before joining the no-overlap set.
    for section_id, intervals in intervals_by_section.items():
        fixed = [
            model.NewIntervalVar(train.start, train.end - train.start, train.end, f"train_{index}_{section_id}")
            for index, train in enumerate(
                merge_occupations(problem.trains_by_section.get(section_id, []))
            )
            if train.end > train.start
        ]
        model.AddNoOverlap(intervals + fixed)

    # (5) resource capacity
    for resource_id, demands in demands_by_resource.items():
        capacity = problem.resources[resource_id].capacity
        model.AddCumulative([item[0] for item in demands], [item[1] for item in demands], capacity)

    # (6) mandatory dependencies between tasks being planned
    for dependency in problem.dependencies:
        successor = task_present.get(dependency.successor)
        if successor is None:
            continue
        if dependency.predecessor in problem.tasks:
            predecessor = task_present.get(dependency.predecessor)
            if predecessor is None:
                # Predecessor is pending but has no candidate window.
                model.Add(successor == 0)
                continue
            model.AddImplication(successor, predecessor)
            model.Add(
                task_start[dependency.successor]
                >= task_end[dependency.predecessor] + dependency.gap
            ).OnlyEnforceIf(successor)

    weights = {
        task_id: int(round(problem.tasks[task_id].priority_score * PRIORITY_SCALE))
        for task_id in task_present
    }
    # Scale the primary term above the largest possible tie-break total so the
    # tie-break can never trade away placed priority weight.
    primary_scale = sum(weights.values()) * (problem.horizon_end + 1) + 1
    model.Maximize(
        sum(
            primary_scale * weights[t] * task_present[t] - weights[t] * task_start[t]
            for t in task_present
        )
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = workers
    status = solver.Solve(model)
    status_name = solver.StatusName(status)

    assignments: list[Assignment] = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for (task_id, window_id), x in placed.items():
            if solver.Value(x):
                start = solver.Value(starts[(task_id, window_id)])
                duration = next(
                    option.duration
                    for option in by_task[task_id]
                    if option.window_id == window_id
                )
                assignments.append(Assignment(task_id, window_id, start, start + duration))

    proto = model.Proto()
    return SolveResult(
        status=status_name,
        wall_time=solver.WallTime(),
        objective=solver.ObjectiveValue() if assignments else None,
        assignments=sorted(assignments, key=lambda item: (item.start, item.task_id)),
        variables=len(proto.variables),
        constraints=len(proto.constraints),
    )
