"""What-if simulation: change planning inputs and compare against a baseline.

Both plans are solved deterministically from the same inputs, so any
difference comes from the changes. The scenario prefers to keep tasks in
their baseline window when that costs no priority weight, so only work
affected by the changes moves.

Supported changes:
    WINDOW_UNAVAILABLE    {"window_id"}
    WINDOW_SHORTEN        {"window_id", "minutes"}        end moves earlier
    RESOURCE_UNAVAILABLE  {"resource_id"}
    TASK_DURATION         {"task_id", "minutes"}          added to the work time
    TASK_PRIORITY         {"task_id", "priority_score"}
    TASK_REMOVE           {"task_id"}
    TRAIN_ADD             {"section_id", "start_time", "end_time"}
"""

from __future__ import annotations

import copy
from datetime import timedelta
from typing import Any

from railopt_optimizer.block_planning.model import parse_time
from railopt_optimizer.block_planning.service import run_pipeline, summarize

CHANGE_TYPES = {
    "WINDOW_UNAVAILABLE",
    "WINDOW_SHORTEN",
    "RESOURCE_UNAVAILABLE",
    "TASK_DURATION",
    "TASK_PRIORITY",
    "TASK_REMOVE",
    "TRAIN_ADD",
}


def _find(rows: list[dict], key: str, value: Any, label: str) -> dict:
    for row in rows:
        if row.get(key) == value:
            return row
    raise ValueError(f"Unknown {label}: {value}")


def _positive_minutes(change: dict) -> int:
    minutes = int(change.get("minutes") or 0)
    if minutes <= 0:
        raise ValueError(f"{change['type']} needs a positive 'minutes'")
    return minutes


def apply_changes(payload: dict[str, Any], changes: list[dict[str, Any]]) -> tuple[dict, list[str]]:
    """Return a changed copy of the planning payload and a description per change."""
    scenario = copy.deepcopy(payload)
    descriptions: list[str] = []

    for change in changes:
        kind = change.get("type")
        if kind not in CHANGE_TYPES:
            raise ValueError(f"Unknown change type: {kind}")

        if kind == "WINDOW_UNAVAILABLE":
            window = _find(scenario["windows"], "window_id", change.get("window_id"), "window")
            window["available"] = False
            window["status"] = "UNAVAILABLE"
            descriptions.append(f"{window['window_id']} made unavailable")

        elif kind == "WINDOW_SHORTEN":
            window = _find(scenario["windows"], "window_id", change.get("window_id"), "window")
            minutes = _positive_minutes(change)
            start, end = parse_time(window["start_time"]), parse_time(window["end_time"])
            new_end = end - timedelta(minutes=minutes)
            if new_end <= start:
                raise ValueError(f"{window['window_id']} is only {int((end - start).total_seconds() // 60)} min long")
            window["end_time"] = new_end.strftime("%Y-%m-%d %H:%M:%S")
            descriptions.append(f"{window['window_id']} shortened by {minutes} min")

        elif kind == "RESOURCE_UNAVAILABLE":
            resource = _find(scenario["resources"], "resource_id", change.get("resource_id"), "resource")
            resource["status"] = "UNAVAILABLE"
            descriptions.append(f"{resource['resource_id']} made unavailable")

        elif kind == "TASK_DURATION":
            task_id = change.get("task_id")
            _find(scenario["tasks"], "task_id", task_id, "pending task")
            minutes = _positive_minutes(change)
            for requirement in scenario["requirements"]:
                if requirement["task_id"] == task_id:
                    requirement["minimum_block_duration_min"] = (
                        int(requirement.get("minimum_block_duration_min") or 0) + minutes
                    )
            descriptions.append(f"{task_id} takes {minutes} min longer")

        elif kind == "TASK_PRIORITY":
            task = _find(scenario["tasks"], "task_id", change.get("task_id"), "pending task")
            score = float(change.get("priority_score"))
            if not 0 <= score <= 100:
                raise ValueError("priority_score must be between 0 and 100")
            descriptions.append(f"{task['task_id']} priority {task.get('priority_score')} → {score:g}")
            task["priority_score"] = score

        elif kind == "TASK_REMOVE":
            task_id = change.get("task_id")
            _find(scenario["tasks"], "task_id", task_id, "pending task")
            scenario["tasks"] = [t for t in scenario["tasks"] if t["task_id"] != task_id]
            scenario["requirements"] = [r for r in scenario["requirements"] if r["task_id"] != task_id]
            descriptions.append(f"{task_id} removed from planning")

        elif kind == "TRAIN_ADD":
            section_id = change.get("section_id")
            start, end = parse_time(change["start_time"]), parse_time(change["end_time"])
            if end <= start:
                raise ValueError("TRAIN_ADD needs end_time after start_time")
            index = sum(1 for t in scenario["trains"] if t["movement_id"].startswith("WHATIF_")) + 1
            scenario["trains"].append(
                {
                    "movement_id": f"WHATIF_{index:03d}",
                    "section_id": section_id,
                    "entry_time": start.strftime("%Y-%m-%d %H:%M:%S"),
                    "exit_time": end.strftime("%Y-%m-%d %H:%M:%S"),
                }
            )
            descriptions.append(
                f"Extra train on {section_id} {start:%d %b %H:%M}–{end:%H:%M}"
            )

    if not scenario["tasks"]:
        raise ValueError("The scenario leaves no tasks to plan")
    return scenario, descriptions


def run_what_if(payload: dict[str, Any], changes: list[dict[str, Any]]) -> dict[str, Any]:
    scenario_payload, descriptions = apply_changes(payload, changes)

    baseline = run_pipeline(payload, deterministic=True)
    reference = {item.task_id: item.window_id for item in baseline.result.assignments}
    scenario = run_pipeline(scenario_payload, deterministic=True, reference=reference)

    base_by_task = {item.task_id: item for item in baseline.result.assignments}
    scen_by_task = {item.task_id: item for item in scenario.result.assignments}
    unscheduled = {row["task_id"]: row for row in summarize(scenario)["unscheduled"]}

    def slot(run, item) -> dict[str, Any]:
        return {
            "window_id": item.window_id,
            "section_id": run.problem.tasks[item.task_id].section_id,
            "start": run.problem.to_clock(item.start),
            "end": run.problem.to_clock(item.end),
        }

    added, removed, moved = [], [], []
    unchanged = 0
    for task_id, item in scen_by_task.items():
        before = base_by_task.get(task_id)
        score = scenario.problem.tasks[task_id].priority_score
        if before is None:
            added.append({"task_id": task_id, "priority_score": score, "to": slot(scenario, item)})
        elif (before.window_id, before.start) != (item.window_id, item.start):
            moved.append(
                {
                    "task_id": task_id,
                    "priority_score": score,
                    "from": slot(baseline, before),
                    "to": slot(scenario, item),
                }
            )
        else:
            unchanged += 1
    for task_id, before in base_by_task.items():
        if task_id in scen_by_task:
            continue
        reason = unscheduled.get(task_id)
        removed.append(
            {
                "task_id": task_id,
                "priority_score": baseline.problem.tasks[task_id].priority_score,
                "from": slot(baseline, before),
                "reason_code": reason["reason_code"] if reason else "REMOVED",
                "reason": reason["reason"] if reason else "Removed from planning by the scenario",
            }
        )

    by_priority = lambda row: -row["priority_score"]  # noqa: E731
    base_summary, scen_summary = summarize(baseline), summarize(scenario)
    return {
        "changes": descriptions,
        "baseline": {key: base_summary[key] for key in ("solver", "validation", "kpis")},
        "scenario": {key: scen_summary[key] for key in ("solver", "validation", "kpis")},
        "diff": {
            "added": sorted(added, key=by_priority),
            "removed": sorted(removed, key=by_priority),
            "moved": sorted(moved, key=by_priority),
            "unchanged": unchanged,
        },
        "scenario_assignments": scen_summary["assignments"],
    }
