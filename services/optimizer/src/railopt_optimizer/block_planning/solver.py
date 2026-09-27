"""CP-SAT block planner: assign pending tasks to block windows.

Decision variables
    x[t, w]      task t is placed in candidate window w
    start[t, w]  start minute of t inside w (optional interval)

Hard constraints
    1. each task is placed at most once
    2. the task interval lies inside its window
    3. work on a section never overlaps a train movement on that section
       (start domain limited to train-free gaps from the candidate engine)
    4. conflicts from the compatibility engine: tasks on the same asset never
       overlap, and repair/replacement precede testing on that asset. Other
       tasks on a section may work at the same time (coordination). With
       allow_coordination=False, at most one task per section at a time
       (the earlier conservative model, kept for comparison).
    5. mandatory resources: cumulative demand <= capacity
    6. mandatory finish-to-start dependencies between pending tasks: a
       successor is placed only if its predecessor is, and starts at least
       the minimum gap after the predecessor ends

Objective
    lexicographic: first maximise sum(priority weight of placed tasks); then,
    when a reference plan is given (what-if), keep as many tasks as possible
    in their reference window; then minimise sum(weight * start) so
    higher-priority work starts earlier.

Replanning / planner edits
    fixed: task -> (window, start) kept exactly (work already started)
    pins: task -> window the planner requires
    earliest_start: no other work may start before this minute
    A pin that is not a feasible candidate is not enforced and is reported
    in unmet_pins; fixed work of a task no longer planned is reported in
    unmet_fixed.

Deterministic mode (one worker, fixed seed) returns the same plan for the
same inputs; multi-worker search may return a different plan of equal
objective on each run.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from ortools.sat.python import cp_model

from railopt_optimizer.block_planning.candidates import CandidateResult
from railopt_optimizer.block_planning.compatibility import CompatibilityResult
from railopt_optimizer.block_planning.model import PlanningProblem

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
    unmet_fixed: list[str] = field(default_factory=list)
    unmet_pins: list[str] = field(default_factory=list)


def solve(
    problem: PlanningProblem,
    candidates: CandidateResult,
    compatibility: CompatibilityResult,
    time_limit_seconds: float = 20.0,
    workers: int = 8,
    allow_coordination: bool = True,
    deterministic: bool = False,
    reference: dict[str, str] | None = None,
    fixed: dict[str, tuple[str, int, int]] | None = None,
    pins: dict[str, str] | None = None,
    earliest_start: int = 0,
) -> SolveResult:
    """reference: task_id -> window_id of a previous plan to stay close to."""
    fixed = fixed or {}
    pins = pins or {}
    unmet_fixed: list[str] = []
    unmet_pins: list[str] = []
    model = cp_model.CpModel()
    by_task = candidates.by_task()

    placed: dict[tuple[str, str], cp_model.IntVar] = {}
    starts: dict[tuple[str, str], cp_model.IntVar] = {}
    intervals_by_section: dict[str, list] = {}
    intervals_by_task: dict[str, list] = {}
    demands_by_resource: dict[str, list[tuple]] = {}

    task_present: dict[str, cp_model.IntVar] = {}
    task_start: dict[str, cp_model.IntVar] = {}
    task_end: dict[str, cp_model.IntVar] = {}

    for task_id, options in by_task.items():
        if task_id in fixed:
            continue
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
            # (2) + (3): start only inside a train-free gap long enough for the task
            domain = cp_model.Domain.FromIntervals(
                [[gap_start, gap_end - option.duration] for gap_start, gap_end in option.gaps]
            )
            s = model.NewIntVarFromDomain(domain, f"s_{task_id}_{window.window_id}")
            interval = model.NewOptionalFixedSizeIntervalVar(
                s, option.duration, x, f"i_{task_id}_{window.window_id}"
            )
            placed[key], starts[key] = x, s
            choices.append(x)

            model.Add(t_start == s).OnlyEnforceIf(x)
            model.Add(t_end == s + option.duration).OnlyEnforceIf(x)

            intervals_by_section.setdefault(task.section_id, []).append(interval)
            intervals_by_task.setdefault(task_id, []).append(interval)
            for need in problem.needs.get(task_id, []):
                demands_by_resource.setdefault(need.resource_id, []).append(
                    (interval, need.quantity)
                )

        # (1) at most once; present iff one window chosen
        model.Add(sum(choices) == present)
        model.Add(t_start == 0).OnlyEnforceIf(present.Not())
        model.Add(t_end == 0).OnlyEnforceIf(present.Not())

    # Committed (frozen) work: constant intervals that still block their
    # asset and resources and anchor dependencies.
    fixed_assignments: list[Assignment] = []
    for task_id, (window_id, start, end) in fixed.items():
        task = problem.tasks.get(task_id)
        if task is None:
            unmet_fixed.append(task_id)
            continue
        present = model.NewConstant(1)
        task_present[task_id] = present
        task_start[task_id] = model.NewConstant(start)
        task_end[task_id] = model.NewConstant(end)
        interval = model.NewIntervalVar(start, end - start, end, f"fixed_{task_id}")
        intervals_by_task.setdefault(task_id, []).append(interval)
        intervals_by_section.setdefault(task.section_id, []).append(interval)
        for need in problem.needs.get(task_id, []):
            demands_by_resource.setdefault(need.resource_id, []).append((interval, need.quantity))
        if task.asset_id:
            same_asset = [
                other
                for other in by_task
                if other != task_id and problem.tasks[other].asset_id == task.asset_id
            ]
            if same_asset:
                model.AddNoOverlap(
                    [interval] + [i for other in same_asset for i in intervals_by_task.get(other, [])]
                )
        fixed_assignments.append(Assignment(task_id, window_id, start, end))

    # Replanning: frozen work stays exactly where it is; nothing else may
    # start before the disruption time; planner pins force a window.
    for task_id, window_id in pins.items():
        key = (task_id, window_id)
        if key not in placed:
            unmet_pins.append(task_id)
            continue
        model.Add(placed[key] == 1)
    if earliest_start > 0:
        for (task_id, window_id), start_var in starts.items():
            model.Add(start_var >= earliest_start).OnlyEnforceIf(placed[(task_id, window_id)])

    # (4) compatibility conflicts
    if allow_coordination:
        for task_ids in compatibility.same_asset_groups.values():
            model.AddNoOverlap(
                [interval for task_id in task_ids for interval in intervals_by_task.get(task_id, [])]
            )
    else:
        for intervals in intervals_by_section.values():
            model.AddNoOverlap(intervals)
    for first, then in compatibility.type_orders:
        if then in fixed:
            continue  # testing already started; nothing to order against
        both = [task_present[first], task_present[then]]
        model.Add(task_end[first] <= task_start[then]).OnlyEnforceIf(both)

    # (5) resource capacity
    for resource_id, demands in demands_by_resource.items():
        capacity = problem.resources[resource_id].capacity
        model.AddCumulative([item[0] for item in demands], [item[1] for item in demands], capacity)

    # (6) mandatory dependencies between tasks being planned
    for dependency in problem.dependencies:
        successor = task_present.get(dependency.successor)
        if successor is None or dependency.successor in fixed:
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
        if task_id not in fixed
    }
    # Each term is scaled above the largest possible total of the terms below
    # it, so a lower term can never trade away a higher one.
    earliness_bound = sum(weights.values()) * (problem.horizon_end + 1) + 1
    kept = [
        placed[(task_id, window_id)]
        for task_id, window_id in (reference or {}).items()
        if (task_id, window_id) in placed
    ]
    stability_scale = earliness_bound
    primary_scale = (len(kept) + 1) * stability_scale
    model.Maximize(
        sum(primary_scale * weights[t] * task_present[t] for t in weights)
        + sum(stability_scale * x for x in kept)
        - sum(weights[t] * task_start[t] for t in weights)
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_seconds
    solver.parameters.num_search_workers = 1 if deterministic else workers
    if deterministic:
        solver.parameters.random_seed = 0
    status = solver.Solve(model)
    status_name = solver.StatusName(status)

    assignments: list[Assignment] = []
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignments.extend(fixed_assignments)
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
        unmet_fixed=unmet_fixed,
        unmet_pins=unmet_pins,
    )
