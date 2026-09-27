"""Run the block planning pipeline and shape the response."""

from __future__ import annotations

from collections import Counter
from typing import Any

from railopt_optimizer.block_planning.candidates import generate_candidates
from railopt_optimizer.block_planning.model import build_problem
from railopt_optimizer.block_planning.solver import solve
from railopt_optimizer.block_planning.validator import validate

P1_THRESHOLD = 80


def plan_blocks(payload: dict[str, Any]) -> dict[str, Any]:
    problem = build_problem(payload)
    candidates = generate_candidates(problem)
    result = solve(problem, candidates, time_limit_seconds=float(payload.get("time_limit_seconds", 20)))
    report = validate(problem, result.assignments)

    placed = {item.task_id: item for item in result.assignments}
    by_task = candidates.by_task()
    rejections_by_task: dict[str, list] = {}
    for rejection in candidates.rejections:
        rejections_by_task.setdefault(rejection.task_id, []).append(rejection)

    pending_predecessors: dict[str, list[str]] = {}
    for dependency in problem.dependencies:
        if dependency.successor in problem.tasks and dependency.predecessor in problem.tasks:
            pending_predecessors.setdefault(dependency.successor, []).append(dependency.predecessor)

    solved = result.status in ("OPTIMAL", "FEASIBLE")
    unscheduled = []
    for task in sorted(problem.tasks.values(), key=lambda t: -t.priority_score):
        if task.task_id in placed:
            continue
        if not solved and task.task_id in by_task:
            unscheduled.append(
                {
                    "task_id": task.task_id,
                    "priority_score": task.priority_score,
                    "reason_code": "SOLVER_" + result.status,
                    "reason": f"Solver returned {result.status}; no plan was produced",
                    "example": None,
                }
            )
            continue
        if task.task_id not in by_task:
            codes = Counter(r.code for r in rejections_by_task.get(task.task_id, []))
            detail = next(iter(rejections_by_task.get(task.task_id, [])), None)
            unscheduled.append(
                {
                    "task_id": task.task_id,
                    "priority_score": task.priority_score,
                    "reason_code": codes.most_common(1)[0][0] if codes else "NO_CANDIDATE",
                    "reason": "No feasible window: "
                    + ", ".join(f"{count}× {code.lower().replace('_', ' ')}" for code, count in codes.most_common())
                    if codes
                    else "No feasible window",
                    "example": detail.message if detail else None,
                }
            )
            continue
        blocked_by = [p for p in pending_predecessors.get(task.task_id, []) if p not in placed]
        if blocked_by:
            unscheduled.append(
                {
                    "task_id": task.task_id,
                    "priority_score": task.priority_score,
                    "reason_code": "DEPENDENCY_BLOCKED",
                    "reason": f"Predecessor not planned: {', '.join(blocked_by[:3])}",
                    "example": None,
                }
            )
        else:
            unscheduled.append(
                {
                    "task_id": task.task_id,
                    "priority_score": task.priority_score,
                    "reason_code": "NOT_SELECTED",
                    "reason": "Had candidate windows, but section time, trains or resources "
                    "were used by higher-weight work",
                    "example": None,
                }
            )

    available_section_minutes = sum(
        window.duration * len(window.sections)
        for window in problem.windows.values()
        if window.available
    )
    used_minutes = sum(item.end - item.start for item in result.assignments)
    total_weight = sum(task.priority_score for task in problem.tasks.values())
    placed_weight = sum(problem.tasks[t].priority_score for t in placed)
    p1_total = [t for t in problem.tasks.values() if t.priority_score >= P1_THRESHOLD]
    p1_placed = [t for t in p1_total if t.task_id in placed]

    return {
        "solver": {
            "status": result.status,
            "wall_time_seconds": round(result.wall_time, 3),
            "objective": result.objective,
            "variables": result.variables,
            "constraints": result.constraints,
        },
        "validation": {
            "passed": report.passed,
            "checks": report.checks,
            "violations": [vars(v) for v in report.violations],
        },
        "kpis": {
            "tasks_considered": len(problem.tasks),
            "tasks_with_candidates": len(by_task),
            "tasks_scheduled": len(placed),
            "p1_total": len(p1_total),
            "p1_scheduled": len(p1_placed),
            "priority_weighted_completion_pct": round(100 * placed_weight / total_weight, 1)
            if total_weight
            else 0.0,
            "block_utilization_pct": round(100 * used_minutes / available_section_minutes, 1)
            if available_section_minutes
            else 0.0,
            "used_section_minutes": used_minutes,
            "available_section_minutes": available_section_minutes,
            "candidate_pairs": len(candidates.candidates),
            "rejected_pairs": sum(1 for r in candidates.rejections if r.window_id),
        },
        "assignments": [
            {
                "task_id": item.task_id,
                "window_id": item.window_id,
                "block_id": problem.windows[item.window_id].block_id,
                "section_id": problem.tasks[item.task_id].section_id,
                "department": problem.tasks[item.task_id].department,
                "priority_score": problem.tasks[item.task_id].priority_score,
                "start": problem.to_clock(item.start),
                "end": problem.to_clock(item.end),
                "start_minute": item.start,
                "end_minute": item.end,
            }
            for item in result.assignments
        ],
        "unscheduled": unscheduled,
        "rejection_summary": dict(
            Counter(r.code for r in candidates.rejections if r.window_id).most_common()
        ),
    }
