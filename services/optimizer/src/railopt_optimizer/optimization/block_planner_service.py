from __future__ import annotations

from typing import Any, Mapping

import pandas as pd

from railopt_optimizer.planning.optimizer import PlanningConfig, solve_schedule
from railopt_optimizer.validation.plan_validation import validate_schedule

REQUIRED_TABLES = (
    "tasks",
    "dependencies",
    "task_resources",
    "resources",
    "blocks",
    "block_requirements",
    "block_sections",
    "windows",
    "window_sections",
    "trains",
    "compatibility_rules",
)


def _frame(tables: Mapping[str, list[dict[str, Any]]], name: str) -> pd.DataFrame:
    rows = tables.get(name)
    if rows is None:
        raise ValueError(f"Missing optimizer table: {name}")
    return pd.DataFrame(rows)


def _require_columns(df: pd.DataFrame, name: str, columns: list[str]) -> None:
    missing = [column for column in columns if column not in df.columns]
    if missing:
        raise ValueError(f"Optimizer table '{name}' is missing columns: {', '.join(missing)}")


def build_planning_data(tables: Mapping[str, list[dict[str, Any]]]) -> dict[str, pd.DataFrame]:
    missing = [name for name in REQUIRED_TABLES if name not in tables]
    if missing:
        raise ValueError("Missing optimizer tables: " + ", ".join(missing))

    data = {name: _frame(tables, name) for name in REQUIRED_TABLES}

    _require_columns(data["tasks"], "tasks", [
        "task_id", "section_id", "estimated_duration_min", "due_date", "status", "required_block_type"
    ])
    _require_columns(data["dependencies"], "dependencies", [
        "predecessor_task_id", "successor_task_id", "minimum_gap_min", "mandatory"
    ])
    _require_columns(data["task_resources"], "task_resources", [
        "task_resource_id", "task_id", "resource_id", "quantity"
    ])
    _require_columns(data["resources"], "resources", [
        "resource_id", "availability_start", "availability_end", "capacity"
    ])
    _require_columns(data["blocks"], "blocks", ["block_id", "status"])
    _require_columns(data["windows"], "windows", [
        "window_id", "block_id", "section_id", "start_time", "end_time", "duration_min", "block_type", "available", "status"
    ])
    _require_columns(data["window_sections"], "window_sections", ["window_id", "section_id"])
    _require_columns(data["trains"], "trains", ["movement_id", "section_id", "entry_time", "exit_time"])

    for name in ("tasks", "windows", "window_sections", "block_sections"):
        data[name]["section_id"] = data[name]["section_id"].astype(str).str.replace("-", "", regex=False).str.strip()

    for name, columns in {
        "windows": ["start_time", "end_time"],
        "resources": ["availability_start", "availability_end"],
        "trains": ["entry_time", "exit_time"],
    }.items():
        for column in columns:
            data[name][column] = pd.to_datetime(data[name][column], errors="raise")

    data["tasks"]["estimated_duration_min"] = pd.to_numeric(
        data["tasks"]["estimated_duration_min"], errors="raise"
    ).astype(int)
    data["tasks"]["due_date"] = pd.to_datetime(data["tasks"]["due_date"], errors="raise")
    data["dependencies"]["minimum_gap_min"] = pd.to_numeric(
        data["dependencies"]["minimum_gap_min"], errors="coerce"
    ).fillna(0).astype(int)
    data["task_resources"]["quantity"] = pd.to_numeric(
        data["task_resources"]["quantity"], errors="coerce"
    ).fillna(0).astype(int)
    data["resources"]["capacity"] = pd.to_numeric(
        data["resources"]["capacity"], errors="raise"
    ).astype(int)
    data["windows"]["duration_min"] = pd.to_numeric(
        data["windows"]["duration_min"], errors="raise"
    ).astype(int)

    if "planning_priority" not in data["tasks"].columns:
        if "priority_score" in data["tasks"].columns:
            data["tasks"]["planning_priority"] = pd.to_numeric(
                data["tasks"]["priority_score"], errors="coerce"
            ).fillna(0)
        else:
            data["tasks"]["planning_priority"] = 0.0
    else:
        data["tasks"]["planning_priority"] = pd.to_numeric(
            data["tasks"]["planning_priority"], errors="coerce"
        ).fillna(0)

    return data


def optimize_block_plan(
    tables: Mapping[str, list[dict[str, Any]]],
    time_limit_seconds: float = 60.0,
    workers: int = 8,
):
    if time_limit_seconds <= 0:
        raise ValueError("time_limit_seconds must be positive")
    if workers <= 0:
        raise ValueError("workers must be positive")

    data = build_planning_data(tables)
    result = solve_schedule(
        data,
        PlanningConfig(time_limit_seconds=time_limit_seconds, workers=workers),
    )

    schedule = []
    for row in result.schedule.to_dict(orient="records"):
        schedule.append(
            {
                "task_id": str(row["task_id"]),
                "scheduled": bool(row["scheduled"]),
                "window_id": row["window_id"],
                "block_id": row["block_id"],
                "start_time": None if pd.isna(row["start_time"]) else pd.Timestamp(row["start_time"]).isoformat(),
                "end_time": None if pd.isna(row["end_time"]) else pd.Timestamp(row["end_time"]).isoformat(),
                "planning_priority": float(row["planning_priority"]),
                "status": None if pd.isna(row["status"]) else str(row["status"]),
            }
        )

    validation = validate_schedule(data, result.schedule)

    return {
        "solver_status": result.status,
        "objective_value": float(result.objective_value),
        "schedule": schedule,
        "metrics": result.metrics,
        "validation": validation,
        "compatibility_analysis": result.compatibility_analysis,
        "conflict_edges": result.conflict_edges,
    }
