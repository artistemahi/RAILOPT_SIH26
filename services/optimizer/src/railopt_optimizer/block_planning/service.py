"""Run the block planning pipeline and shape the response."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any

from railopt_optimizer.block_planning.candidates import CandidateResult, generate_candidates
from railopt_optimizer.block_planning.compatibility import (
    CompatibilityResult,
    build_compatibility,
)
from railopt_optimizer.block_planning.model import PlanningProblem, build_problem
from railopt_optimizer.block_planning.solver import Assignment, SolveResult, solve
from railopt_optimizer.block_planning.validator import ValidationReport, validate

SAMPLE_LIMIT = 20
TASK_EXAMPLE_LIMIT = 5


def _coordination(problem: PlanningProblem, assignments: list[Assignment]) -> dict[str, Any]:
    """Planned tasks from different departments working on one section at once."""
    pairs = []
    windows: set[str] = set()
    for index, a in enumerate(assignments):
        for b in assignments[index + 1 :]:
            task_a, task_b = problem.tasks[a.task_id], problem.tasks[b.task_id]
            if (
                task_a.section_id == task_b.section_id
                and task_a.department != task_b.department
                and a.start < b.end
                and b.start < a.end
            ):
                windows.add(a.window_id)
                pairs.append(
                    {
                        "section_id": task_a.section_id,
                        "tasks": [a.task_id, b.task_id],
                        "departments": sorted([task_a.department, task_b.department]),
                        "window_id": a.window_id,
                    }
                )
    return {
        "multi_department_pairs": len(pairs),
        "windows_with_multi_department_work": len(windows),
        "sample": pairs[:SAMPLE_LIMIT],
    }


def _kpis(
    problem: PlanningProblem,
    candidates: CandidateResult,
    result: SolveResult,
) -> dict[str, Any]:
    placed = {item.task_id for item in result.assignments}
    available_section_minutes = sum(
        window.duration * len(window.sections)
        for window in problem.windows.values()
        if window.available
    )
    used_minutes = sum(item.end - item.start for item in result.assignments)
    total_weight = sum(task.priority_score for task in problem.tasks.values())
    placed_weight = sum(problem.tasks[t].priority_score for t in placed)
    p1_total = [t for t in problem.tasks.values() if t.priority_score >= problem.p1_threshold]
    return {
        "tasks_considered": len(problem.tasks),
        "tasks_with_candidates": len(candidates.by_task()),
        "tasks_scheduled": len(placed),
        "p1_total": len(p1_total),
        "p1_scheduled": sum(1 for t in p1_total if t.task_id in placed),
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
    }


def _unscheduled(
    problem: PlanningProblem,
    candidates: CandidateResult,
    result: SolveResult,
) -> list[dict[str, Any]]:
    placed = {item.task_id for item in result.assignments}
    by_task = candidates.by_task()
    solved = result.status in ("OPTIMAL", "FEASIBLE")
    rejections_by_task: dict[str, list] = {}
    for rejection in candidates.rejections:
        rejections_by_task.setdefault(rejection.task_id, []).append(rejection)

    pending_predecessors: dict[str, list[str]] = {}
    for dependency in problem.dependencies:
        if dependency.successor in problem.tasks and dependency.predecessor in problem.tasks:
            pending_predecessors.setdefault(dependency.successor, []).append(dependency.predecessor)

    rows = []
    for task in sorted(problem.tasks.values(), key=lambda t: -t.priority_score):
        if task.task_id in placed:
            continue
        row = {"task_id": task.task_id, "priority_score": task.priority_score, "example": None}
        if task.task_id not in by_task:
            rejections = rejections_by_task.get(task.task_id, [])
            codes = Counter(r.code for r in rejections)
            row["reason_code"] = codes.most_common(1)[0][0] if codes else "NO_CANDIDATE"
            row["reason"] = (
                "No feasible window: "
                + ", ".join(f"{n}× {code.lower().replace('_', ' ')}" for code, n in codes.most_common())
                if codes
                else "No feasible window"
            )
            row["example"] = rejections[0].message if rejections else None
        elif not solved:
            row["reason_code"] = "SOLVER_" + result.status
            row["reason"] = f"Solver returned {result.status}; no plan was produced"
        elif blocked := [p for p in pending_predecessors.get(task.task_id, []) if p not in placed]:
            row["reason_code"] = "DEPENDENCY_BLOCKED"
            row["reason"] = f"Predecessor not planned: {', '.join(blocked[:3])}"
        else:
            row["reason_code"] = "NOT_SELECTED"
            row["reason"] = (
                "Had candidate windows, but train-free time, resources or same-asset "
                "work were taken by higher-weight tasks"
            )
        rows.append(row)
    return rows


def _task_details(
    problem: PlanningProblem, candidates: CandidateResult, result: SolveResult
) -> list[dict[str, Any]]:
    """Per task: candidate windows, why other windows were rejected, and the outcome."""
    placed = {item.task_id: item for item in result.assignments}
    by_task = candidates.by_task()
    rejections: dict[str, list] = {}
    for rejection in candidates.rejections:
        rejections.setdefault(rejection.task_id, []).append(rejection)
    rows = []
    for task in sorted(problem.tasks.values(), key=lambda t: -t.priority_score):
        options = by_task.get(task.task_id, [])
        rejected = rejections.get(task.task_id, [])
        assignment = placed.get(task.task_id)
        rows.append(
            {
                "task_id": task.task_id,
                "section_id": task.section_id,
                "department": task.department,
                "task_type": task.task_type,
                "asset_id": task.asset_id,
                "priority_score": task.priority_score,
                "candidate_windows": [option.window_id for option in options],
                "rejections": dict(Counter(r.code for r in rejected).most_common()),
                "rejection_examples": [
                    {"window_id": r.window_id, "code": r.code, "message": r.message}
                    for r in rejected[:TASK_EXAMPLE_LIMIT]
                ],
                "scheduled_window": assignment.window_id if assignment else None,
            }
        )
    return rows


def _compatibility_edges(compatibility: CompatibilityResult) -> list[dict[str, Any]]:
    return [
        {"a": a, "b": b, "kind": data["kind"], "rule": data["rule"], "detail": str(data["detail"])}
        for a, b, data in compatibility.graph.edges(data=True)
    ]


def _asset_downtime(problem: PlanningProblem, assignments: list[Assignment]) -> dict[str, Any]:
    """Planned maintenance time per asset: the asset is out of service while
    it is worked on. Work on one asset inside one window is one outage."""
    by_asset: dict[str, list[Assignment]] = {}
    for item in assignments:
        asset_id = problem.tasks[item.task_id].asset_id
        if asset_id:
            by_asset.setdefault(asset_id, []).append(item)
    rows = []
    for asset_id, items in by_asset.items():
        windows = {item.window_id for item in items}
        rows.append(
            {
                "asset_id": asset_id,
                "tasks": len(items),
                "downtime_minutes": sum(item.end - item.start for item in items),
                "outages": len(windows),
            }
        )
    rows.sort(key=lambda row: -row["downtime_minutes"])
    horizon = problem.horizon_end
    total = sum(row["downtime_minutes"] for row in rows)
    return {
        "assets_worked": len(rows),
        "total_downtime_minutes": total,
        "outages": sum(row["outages"] for row in rows),
        "bundled_assets": sum(1 for row in rows if row["tasks"] > row["outages"]),
        "worked_assets_availability_pct": round(100 * (1 - total / (horizon * len(rows))), 2) if rows else 100.0,
        "top": rows[:SAMPLE_LIMIT],
    }


def _compatibility_summary(compatibility: CompatibilityResult) -> dict[str, Any]:
    return {
        "edges_by_type": compatibility.edge_counts(),
        "same_asset_groups": len(compatibility.same_asset_groups),
        "task_type_orders": len(compatibility.type_orders),
        "dependency_cycles": compatibility.dependency_cycles,
        "deadline_conflicts": compatibility.deadline_conflicts,
    }


@dataclass
class PipelineRun:
    problem: PlanningProblem
    candidates: CandidateResult
    compatibility: CompatibilityResult
    result: SolveResult
    report: ValidationReport


def run_pipeline(
    payload: dict[str, Any],
    deterministic: bool = False,
    reference: dict[str, str] | None = None,
    allow_coordination: bool = True,
    **solve_options: Any,
) -> PipelineRun:
    """Candidates -> compatibility -> CP-SAT -> independent validation."""
    problem = build_problem(payload)
    candidates = generate_candidates(problem)
    compatibility = build_compatibility(problem, candidates)
    result = solve(
        problem,
        candidates,
        compatibility,
        time_limit_seconds=float(payload.get("time_limit_seconds", 20)),
        allow_coordination=allow_coordination,
        deterministic=deterministic,
        reference=reference,
        **solve_options,
    )
    report = validate(
        problem,
        result.assignments,
        section_exclusive=not allow_coordination,
        committed=frozenset(solve_options.get("fixed") or {}),
    )
    return PipelineRun(problem, candidates, compatibility, result, report)


def summarize(run: PipelineRun) -> dict[str, Any]:
    problem, result = run.problem, run.result
    return {
        "solver": {
            "status": result.status,
            "wall_time_seconds": round(result.wall_time, 3),
            "objective": result.objective,
            "variables": result.variables,
            "constraints": result.constraints,
        },
        "validation": {
            "passed": run.report.passed,
            "checks": run.report.checks,
            "violations": [vars(v) for v in run.report.violations],
        },
        "kpis": _kpis(problem, run.candidates, result),
        "coordination": _coordination(problem, result.assignments),
        "asset_downtime": _asset_downtime(problem, result.assignments),
        "compatibility": _compatibility_summary(run.compatibility),
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
        "unscheduled": _unscheduled(problem, run.candidates, result),
        "rejection_summary": dict(
            Counter(r.code for r in run.candidates.rejections if r.window_id).most_common()
        ),
    }


def plan_blocks(payload: dict[str, Any]) -> dict[str, Any]:
    run = run_pipeline(payload)
    response = summarize(run)

    if payload.get("include_details"):
        response["task_details"] = _task_details(run.problem, run.candidates, run.result)
        response["compatibility_edges"] = _compatibility_edges(run.compatibility)

    if payload.get("compare_modes"):
        # Same inputs, earlier conservative model: one task per section at a time.
        exclusive = run_pipeline(payload, allow_coordination=False)
        response["comparison"] = {
            "section_exclusive": {
                "solver_status": exclusive.result.status,
                "validation_passed": exclusive.report.passed,
                **_kpis(exclusive.problem, exclusive.candidates, exclusive.result),
            },
            "coordinated": {
                "solver_status": run.result.status,
                "validation_passed": run.report.passed,
                **response["kpis"],
            },
        }

    return response
