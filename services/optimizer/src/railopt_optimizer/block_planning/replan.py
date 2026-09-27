"""Emergency replanning and planner modifications of a stored plan version.

Starts from a previous plan (its assignments) and the current planning
inputs with the disruption applied (same change types as what-if):

    freeze_before  work that started before this time is frozen (committed):
                   it keeps its window and times whatever the disruption,
                   still occupies its asset and resources, and no other
                   work may start before this time
    pins           planner edits: task -> window the task must use

All other tasks are re-optimised with CP-SAT, preferring their previous
window, deterministically. The result is independently validated and
compared with the previous plan (frozen / unchanged / moved / added /
removed).
"""

from __future__ import annotations

from typing import Any

from railopt_optimizer.block_planning.model import parse_time
from railopt_optimizer.block_planning.service import (
    _compatibility_edges,
    _task_details,
    run_pipeline,
    summarize,
)
from railopt_optimizer.block_planning.what_if import apply_changes


def _minute(payload: dict[str, Any], value: str) -> int:
    start = parse_time(f"{payload['horizon_start']} 00:00:00")
    return int((parse_time(value) - start).total_seconds() // 60)


def replan(
    payload: dict[str, Any],
    previous: list[dict[str, Any]],
    changes: list[dict[str, Any]],
    freeze_before: str | None = None,
    pins: dict[str, str] | None = None,
) -> dict[str, Any]:
    scenario_payload, descriptions = apply_changes(payload, changes) if changes else (payload, [])

    freeze_minute = _minute(payload, freeze_before) if freeze_before else 0
    fixed = {
        item["task_id"]: (item["window_id"], int(item["start_minute"]), int(item["end_minute"]))
        for item in previous
        if freeze_before and int(item["start_minute"]) < freeze_minute
    }
    # Frozen work already has its place; a pin on it has nothing to do.
    pins = {task_id: window_id for task_id, window_id in (pins or {}).items() if task_id not in fixed}
    for task_id, window_id in pins.items():
        descriptions.append(f"{task_id} pinned to {window_id}")

    reference = {item["task_id"]: item["window_id"] for item in previous}
    run = run_pipeline(
        scenario_payload,
        deterministic=True,
        reference=reference,
        fixed=fixed,
        pins=pins,
        earliest_start=freeze_minute,
    )
    summary = summarize(run)
    if payload.get("include_details"):
        summary["task_details"] = _task_details(run.problem, run.candidates, run.result)
        summary["compatibility_edges"] = _compatibility_edges(run.compatibility)

    before = {item["task_id"]: item for item in previous}
    after = {item["task_id"]: item for item in summary["assignments"]}
    unscheduled = {row["task_id"]: row for row in summary["unscheduled"]}

    def slot(item: dict[str, Any]) -> dict[str, Any]:
        return {key: item[key] for key in ("window_id", "section_id", "start", "end")}

    frozen, unchanged, moved, added, removed = [], [], [], [], []
    for task_id, item in after.items():
        old = before.get(task_id)
        row = {"task_id": task_id, "priority_score": item["priority_score"], "to": slot(item)}
        if task_id in fixed and task_id not in run.result.unmet_fixed:
            frozen.append(row)
        elif old is None:
            added.append(row)
        elif (old["window_id"], old["start_minute"]) != (item["window_id"], item["start_minute"]):
            moved.append({**row, "from": slot(old)})
        else:
            unchanged.append(task_id)
    for task_id, old in before.items():
        if task_id in after:
            continue
        reason = unscheduled.get(task_id)
        removed.append(
            {
                "task_id": task_id,
                "priority_score": old["priority_score"],
                "from": slot(old),
                "reason_code": reason["reason_code"] if reason else "REMOVED",
                "reason": reason["reason"] if reason else "Removed from planning",
            }
        )

    by_priority = lambda row: -row["priority_score"]  # noqa: E731
    summary["replan"] = {
        "changes": descriptions,
        "freeze_before": freeze_before,
        "frozen": sorted(frozen, key=by_priority),
        "frozen_conflicts": run.result.unmet_fixed,
        "unmet_pins": run.result.unmet_pins,
        "diff": {
            "moved": sorted(moved, key=by_priority),
            "added": sorted(added, key=by_priority),
            "removed": sorted(removed, key=by_priority),
            "unchanged": len(unchanged),
        },
    }
    return summary
