from __future__ import annotations

from typing import Any

import pandas as pd


def _as_bool(value: object) -> bool:
    return str(value).strip().upper() in {"TRUE", "1", "YES", "Y"}


def _naive_timestamp(value: object) -> pd.Timestamp:
    timestamp = pd.Timestamp(value)
    if timestamp.tzinfo is not None:
        return timestamp.tz_convert("UTC").tz_localize(None)
    return timestamp


def _overlap(a_start: pd.Timestamp, a_end: pd.Timestamp, b_start: pd.Timestamp, b_end: pd.Timestamp) -> bool:
    return a_start < b_end and b_start < a_end


def validate_schedule(data: dict[str, pd.DataFrame], schedule: pd.DataFrame) -> dict[str, Any]:
    """Independent post-solve validation of hard scheduling rules.

    This does not alter the optimizer decision. It checks the returned plan against
    the same operational facts represented by the input tables so API consumers can
    distinguish a solver result from a validated plan.
    """
    violations: list[dict[str, Any]] = []

    scheduled = schedule.loc[schedule["scheduled"] == True].copy()
    if scheduled.empty:
        return {"valid": True, "violation_count": 0, "violations": []}

    scheduled["start_time"] = pd.to_datetime(scheduled["start_time"], errors="coerce").map(_naive_timestamp)
    scheduled["end_time"] = pd.to_datetime(scheduled["end_time"], errors="coerce").map(_naive_timestamp)

    tasks = data["tasks"].set_index("task_id")
    windows = data["windows"].set_index("window_id")
    resources = data["resources"].set_index("resource_id")
    task_resources = data["task_resources"]
    dependencies = data["dependencies"]
    trains = data["trains"]

    # Every scheduled task must reference an available, compatible window and fit inside it.
    for row in scheduled.itertuples(index=False):
        task_id = str(row.task_id)
        window_id = row.window_id
        if window_id is None or window_id not in windows.index:
            violations.append({
                "type": "INVALID_WINDOW",
                "task_id": task_id,
                "message": "Scheduled task has no valid window assignment.",
            })
            continue

        window = windows.loc[window_id]
        if not _as_bool(window.available) or str(window.status).upper() == "UNAVAILABLE":
            violations.append({
                "type": "WINDOW_UNAVAILABLE",
                "task_id": task_id,
                "window_id": window_id,
                "message": "Scheduled task uses an unavailable window.",
            })

        window_start = _naive_timestamp(window.start_time)
        window_end = _naive_timestamp(window.end_time)
        if row.start_time < window_start or row.end_time > window_end:
            violations.append({
                "type": "OUTSIDE_WINDOW",
                "task_id": task_id,
                "window_id": window_id,
                "message": "Scheduled interval is outside its assigned window.",
            })

        if int((row.end_time - row.start_time).total_seconds() // 60) != int(tasks.loc[task_id, "estimated_duration_min"]):
            violations.append({
                "type": "DURATION_MISMATCH",
                "task_id": task_id,
                "message": "Scheduled duration does not match task duration.",
            })

    # Same-section tasks cannot overlap.
    section_groups: dict[str, list[Any]] = {}
    for row in scheduled.itertuples(index=False):
        section_id = str(tasks.loc[str(row.task_id), "section_id"])
        section_groups.setdefault(section_id, []).append(row)

    for section_id, rows in section_groups.items():
        rows = sorted(rows, key=lambda item: item.start_time)
        for first, second in zip(rows, rows[1:]):
            if _overlap(first.start_time, first.end_time, second.start_time, second.end_time):
                violations.append({
                    "type": "SECTION_OVERLAP",
                    "task_i": str(first.task_id),
                    "task_j": str(second.task_id),
                    "section_id": section_id,
                    "message": "Two scheduled tasks overlap on the same section.",
                })

    # Resource capacity must never be exceeded by overlapping tasks.
    requirements = task_resources.groupby("resource_id") if not task_resources.empty else []
    for resource_id, group in requirements:
        if resource_id not in resources.index:
            continue
        capacity = int(resources.loc[resource_id, "capacity"])
        resource_rows = []
        for req in group.itertuples(index=False):
            task_id = str(req.task_id)
            match = scheduled[scheduled["task_id"].astype(str) == task_id]
            if match.empty:
                continue
            interval = match.iloc[0]
            resource_rows.append((task_id, interval.start_time, interval.end_time, int(req.quantity)))
        for i, (task_i, start_i, end_i, qty_i) in enumerate(resource_rows):
            for task_j, start_j, end_j, qty_j in resource_rows[i + 1:]:
                if _overlap(start_i, end_i, start_j, end_j) and qty_i + qty_j > capacity:
                    violations.append({
                        "type": "RESOURCE_CAPACITY_OVERLAP",
                        "task_i": task_i,
                        "task_j": task_j,
                        "resource_id": str(resource_id),
                        "capacity": capacity,
                        "combined_quantity": qty_i + qty_j,
                        "message": "Overlapping tasks exceed shared resource capacity.",
                    })

    # Trains occupying the same section cannot overlap a maintenance task.
    train_rows = trains.copy()
    train_rows["section_id"] = train_rows["section_id"].astype(str).str.replace("-", "", regex=False).str.strip()
    train_rows["entry_time"] = pd.to_datetime(train_rows["entry_time"], errors="coerce").map(_naive_timestamp)
    train_rows["exit_time"] = pd.to_datetime(train_rows["exit_time"], errors="coerce").map(_naive_timestamp)
    for row in scheduled.itertuples(index=False):
        task_id = str(row.task_id)
        section_id = str(tasks.loc[task_id, "section_id"])
        section_trains = train_rows[train_rows["section_id"] == section_id]
        for train in section_trains.itertuples(index=False):
            if _overlap(row.start_time, row.end_time, train.entry_time, train.exit_time):
                violations.append({
                    "type": "TRAIN_OVERLAP",
                    "task_id": task_id,
                    "movement_id": str(train.movement_id),
                    "section_id": section_id,
                    "message": "Maintenance task overlaps a train movement on the same section.",
                })

    # Mandatory dependencies among scheduled tasks must respect minimum gap.
    schedule_by_task = {
        str(row.task_id): row for row in scheduled.itertuples(index=False)
    }
    for dep in dependencies.itertuples(index=False):
        if not _as_bool(dep.mandatory):
            continue
        predecessor = schedule_by_task.get(str(dep.predecessor_task_id))
        successor = schedule_by_task.get(str(dep.successor_task_id))
        if predecessor is None or successor is None:
            continue
        required_start = predecessor.end_time + pd.Timedelta(minutes=int(dep.minimum_gap_min or 0))
        if successor.start_time < required_start:
            violations.append({
                "type": "DEPENDENCY_VIOLATION",
                "predecessor_task_id": str(dep.predecessor_task_id),
                "successor_task_id": str(dep.successor_task_id),
                "message": "Successor starts before the required dependency gap.",
            })

    return {
        "valid": not violations,
        "violation_count": len(violations),
        "violations": violations,
    }
