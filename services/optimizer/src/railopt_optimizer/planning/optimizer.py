from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import pandas as pd
from ortools.sat.python import cp_model

from .compatibility import analyze_task_pairs, conflict_edges


@dataclass(frozen=True)
class PlanningConfig:
    alpha_downtime: int = 1
    beta_block_hours: int = 1
    gamma_late_or_deferred: int = 25
    delta_conflict: int = 1
    priority_scale: int = 100
    time_limit_seconds: float = 60.0
    workers: int = 8


@dataclass
class PlanningResult:
    status: str
    objective_value: float
    schedule: pd.DataFrame
    metrics: Dict[str, float]
    compatibility_analysis: List[dict]
    conflict_edges: List[dict]


def _as_bool(value: object) -> bool:
    return str(value).strip().upper() in {"TRUE", "1", "YES", "Y"}


def _normalise_section(value: object) -> str:
    return str(value).replace("-", "").strip()


def load_planning_data(data_root: str | Path, priority_file: str | Path | None = None) -> Dict[str, pd.DataFrame]:
    root = Path(data_root)
    files = {
        "tasks": root / "02_maintenance" / "maintenance_tasks.csv",
        "dependencies": root / "02_maintenance" / "dependencies.csv",
        "task_resources": root / "02_maintenance" / "task_resources.csv",
        "resources": root / "01_master" / "resources.csv",
        "blocks": root / "03_block_planning" / "blocks.csv",
        "block_requirements": root / "03_block_planning" / "block_requirements.csv",
        "block_sections": root / "03_block_planning" / "block_sections.csv",
        "windows": root / "03_block_planning" / "block_windows.csv",
        "window_sections": root / "03_block_planning" / "window_sections.csv",
        "trains": root / "04_operations" / "train_movements.csv",
        "compatibility_rules": root / "05_compatibility" / "compatibility_rules.csv",
    }
    missing = [str(path) for path in files.values() if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing planning tables: " + ", ".join(missing))

    data = {name: pd.read_csv(path) for name, path in files.items()}
    data["tasks"]["section_id"] = data["tasks"]["section_id"].map(_normalise_section)
    data["windows"]["section_id"] = data["windows"]["section_id"].map(_normalise_section)
    data["window_sections"]["section_id"] = data["window_sections"]["section_id"].map(_normalise_section)
    data["block_sections"]["section_id"] = data["block_sections"]["section_id"].map(_normalise_section)

    for name in ("windows", "resources", "trains"):
        for column in ("start_time", "end_time", "availability_start", "availability_end", "entry_time", "exit_time"):
            if column in data[name]:
                data[name][column] = pd.to_datetime(data[name][column])

    if priority_file is not None and Path(priority_file).exists():
        priorities = pd.read_csv(priority_file)
        priority_columns = [
            column
            for column in ("final_priority_score", "predicted_priority_score", "calculated_priority_score", "priority_score")
            if column in priorities
        ]
        if priority_columns and "task_id" in priorities:
            priority_column = priority_columns[0]
            data["tasks"] = data["tasks"].merge(
                priorities[["task_id", priority_column]],
                on="task_id",
                how="left",
                suffixes=("", "_model"),
            )
            merged_column = priority_column if priority_column in data["tasks"] else priority_column + "_model"
            data["tasks"]["planning_priority"] = data["tasks"][merged_column]

    if "planning_priority" not in data["tasks"]:
        data["tasks"]["planning_priority"] = pd.to_numeric(data["tasks"]["priority_score"], errors="coerce")
    data["tasks"]["planning_priority"] = pd.to_numeric(data["tasks"]["planning_priority"], errors="coerce").fillna(0)
    return data


def _candidate_windows(data: Dict[str, pd.DataFrame]) -> Dict[str, List[dict]]:
    tasks = data["tasks"].set_index("task_id")
    blocks = data["blocks"].set_index("block_id")
    windows = data["windows"]
    coverage = data["window_sections"].groupby("window_id")["section_id"].apply(set).to_dict()
    candidates: Dict[str, List[dict]] = {task_id: [] for task_id in tasks.index}

    for row in windows.itertuples(index=False):
        block = blocks.loc[row.block_id]
        if not _as_bool(row.available) or str(row.status).upper() == "UNAVAILABLE":
            continue
        if str(block.status).upper() != "AVAILABLE":
            continue
        sections = coverage.get(row.window_id, {_normalise_section(row.section_id)})
        for task_id, task in tasks.iterrows():
            block_type_matches = task.required_block_type == row.block_type or row.block_type == "COMBINED_BLOCK"
            if not block_type_matches or task.section_id not in sections:
                continue
            if int(task.estimated_duration_min) > int(row.duration_min):
                continue
            candidates[task_id].append(
                {
                    "window_id": row.window_id,
                    "block_id": row.block_id,
                    "section_id": task.section_id,
                    "window_start": row.start_time,
                    "window_end": row.end_time,
                    "window_duration": int(row.duration_min),
                    "block_type": row.block_type,
                }
            )
    return candidates


def _minutes(value: pd.Timestamp, origin: pd.Timestamp) -> int:
    return int((value - origin).total_seconds() // 60)


def solve_schedule(data: Dict[str, pd.DataFrame], config: PlanningConfig | None = None) -> PlanningResult:
    config = config or PlanningConfig()
    tasks = data["tasks"].copy().set_index("task_id")
    dependencies = data["dependencies"]
    task_resources = data["task_resources"]
    resources = data["resources"].set_index("resource_id")
    trains = data["trains"]
    candidates = _candidate_windows(data)
    compatibility_analysis = analyze_task_pairs(data)
    graph_edges = conflict_edges(compatibility_analysis)

    all_times: List[pd.Timestamp] = list(data["windows"]["start_time"]) + list(data["windows"]["end_time"])
    all_times += list(trains["entry_time"]) + list(trains["exit_time"])
    origin = min(all_times)
    horizon = max(_minutes(value, origin) for value in all_times) + 1

    model = cp_model.CpModel()
    task_vars: Dict[str, dict] = {}
    eligible_statuses = {"PENDING", "SCHEDULED", "IN_PROGRESS"}
    for task_id, task in tasks.iterrows():
        duration = int(task.estimated_duration_min)
        scheduled = model.NewBoolVar(f"scheduled_{task_id}")
        start = model.NewIntVar(0, horizon, f"start_{task_id}")
        end = model.NewIntVar(0, horizon + duration, f"end_{task_id}")
        model.Add(end == start + duration)
        window_vars = {}
        for candidate in candidates[task_id]:
            window_id = candidate["window_id"]
            variable = model.NewBoolVar(f"assign_{task_id}_{window_id}")
            window_vars[window_id] = (variable, candidate)
            model.Add(start >= _minutes(candidate["window_start"], origin)).OnlyEnforceIf(variable)
            model.Add(end <= _minutes(candidate["window_end"], origin)).OnlyEnforceIf(variable)
        model.Add(sum(variable for variable, _ in window_vars.values()) == scheduled)
        if str(task.status).upper() not in eligible_statuses:
            model.Add(scheduled == 0)
        task_vars[task_id] = {"scheduled": scheduled, "start": start, "end": end, "windows": window_vars}

    for row in dependencies.itertuples(index=False):
        predecessor = task_vars[row.predecessor_task_id]
        successor = task_vars[row.successor_task_id]
        predecessor_scheduled = predecessor["scheduled"]
        successor_scheduled = successor["scheduled"]
        if _as_bool(row.mandatory):
            model.Add(successor_scheduled <= predecessor_scheduled)
        model.Add(predecessor["end"] + int(row.minimum_gap_min) <= successor["start"]).OnlyEnforceIf([predecessor_scheduled, successor_scheduled])

    for task_id, task in tasks.iterrows():
        scheduled = task_vars[task_id]["scheduled"]
        start = task_vars[task_id]["start"]
        end = task_vars[task_id]["end"]
        for resource_id in task_resources.loc[task_resources.task_id == task_id, "resource_id"].unique():
            resource = resources.loc[resource_id]
            model.Add(start >= _minutes(resource.availability_start, origin)).OnlyEnforceIf(scheduled)
            model.Add(end <= _minutes(resource.availability_end, origin)).OnlyEnforceIf(scheduled)

    resource_intervals: Dict[str, List[cp_model.IntervalVar]] = {resource_id: [] for resource_id in resources.index}
    resource_demands: Dict[str, List[int]] = {resource_id: [] for resource_id in resources.index}
    for task_id, task in tasks.iterrows():
        for row in task_resources[task_resources.task_id == task_id].itertuples(index=False):
            interval = model.NewOptionalIntervalVar(
                task_vars[task_id]["start"],
                int(task.estimated_duration_min),
                task_vars[task_id]["end"],
                task_vars[task_id]["scheduled"],
                f"resource_interval_{row.task_resource_id}",
            )
            resource_intervals[row.resource_id].append(interval)
            resource_demands[row.resource_id].append(int(row.quantity))
    for resource_id, intervals in resource_intervals.items():
        if intervals:
            model.AddCumulative(intervals, resource_demands[resource_id], int(resources.loc[resource_id, "capacity"]))

    section_intervals: Dict[str, List[cp_model.IntervalVar]] = {}
    trains_by_section = trains.assign(section_id=trains["section_id"].map(_normalise_section))
    for task_id, task in tasks.iterrows():
        section_intervals.setdefault(task.section_id, []).append(
            model.NewOptionalIntervalVar(
                task_vars[task_id]["start"],
                int(task.estimated_duration_min),
                task_vars[task_id]["end"],
                task_vars[task_id]["scheduled"],
                f"section_interval_{task_id}",
            )
        )
        for train in trains_by_section[trains_by_section.section_id == task.section_id].itertuples(index=False):
            before_train = model.NewBoolVar(f"before_{task_id}_{train.movement_id}")
            after_train = model.NewBoolVar(f"after_{task_id}_{train.movement_id}")
            model.Add(task_vars[task_id]["end"] <= _minutes(train.entry_time, origin)).OnlyEnforceIf(before_train)
            model.Add(task_vars[task_id]["start"] >= _minutes(train.exit_time, origin)).OnlyEnforceIf(after_train)
            model.AddBoolOr([task_vars[task_id]["scheduled"].Not(), before_train, after_train])
    for intervals in section_intervals.values():
        model.AddNoOverlap(intervals)

    window_assignments: Dict[str, List[cp_model.BoolVar]] = {}
    window_cost_terms = []
    for task_data in task_vars.values():
        for window_id, (variable, _) in task_data["windows"].items():
            window_assignments.setdefault(window_id, []).append(variable)
    windows_by_id = data["windows"].set_index("window_id")
    for window_id, assignments in window_assignments.items():
        used = model.NewBoolVar(f"window_used_{window_id}")
        for assignment in assignments:
            model.Add(assignment <= used)
        window_cost_terms.append(int(windows_by_id.loc[window_id, "duration_min"]) * used)
        for index, first_task_id in enumerate(task_vars):
            first_assignment = task_vars[first_task_id]["windows"].get(window_id)
            if first_assignment is None:
                continue
            for second_task_id in list(task_vars)[index + 1:]:
                second_assignment = task_vars[second_task_id]["windows"].get(window_id)
                if second_assignment is None:
                    continue
                first_type = str(tasks.loc[first_task_id, "required_block_type"])
                second_type = str(tasks.loc[second_task_id, "required_block_type"])
                block_type = str(first_assignment[1]["block_type"])
                if first_type != second_type and block_type != "COMBINED_BLOCK":
                    model.Add(first_assignment[0] + second_assignment[0] <= 1)

    deferred_terms = []
    downtime_terms = []
    lateness_terms = []
    priority_terms = []
    for task_id, task in tasks.iterrows():
        scheduled = task_vars[task_id]["scheduled"]
        priority_terms.append(int(round(float(task.planning_priority) * config.priority_scale)) * scheduled)
        downtime_terms.append(int(task.estimated_duration_min) * scheduled)
        deferred_terms.append(1 - scheduled)
        due_minute = _minutes(pd.to_datetime(task.due_date), origin)
        late = model.NewIntVar(0, horizon + int(task.estimated_duration_min), f"late_{task_id}")
        model.Add(task_vars[task_id]["end"] - due_minute <= late).OnlyEnforceIf(scheduled)
        model.Add(late == 0).OnlyEnforceIf(scheduled.Not())
        lateness_terms.append(late)

    model.Maximize(
        sum(priority_terms)
        - config.alpha_downtime * sum(downtime_terms)
        - config.beta_block_hours * sum(window_cost_terms)
        - config.gamma_late_or_deferred * sum(lateness_terms)
        - config.gamma_late_or_deferred * sum(deferred_terms)
        - config.delta_conflict * 0
    )

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = config.time_limit_seconds
    solver.parameters.num_search_workers = config.workers
    status = solver.Solve(model)
    status_name = solver.StatusName(status)
    feasible = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)

    records = []
    for task_id, task in tasks.iterrows():
        variables = task_vars[task_id]
        is_scheduled = bool(solver.Value(variables["scheduled"])) if feasible else False
        selected = next((candidate for variable, candidate in variables["windows"].values() if solver.Value(variable)), None) if is_scheduled else None
        records.append(
            {
                "task_id": task_id,
                "scheduled": is_scheduled,
                "window_id": selected["window_id"] if selected else None,
                "block_id": selected["block_id"] if selected else None,
                "start_time": origin + pd.Timedelta(minutes=solver.Value(variables["start"])) if is_scheduled else pd.NaT,
                "end_time": origin + pd.Timedelta(minutes=solver.Value(variables["end"])) if is_scheduled else pd.NaT,
                "planning_priority": float(task.planning_priority),
                "status": task.status,
            }
        )
    schedule = pd.DataFrame(records)
    metrics = {
        "scheduled_tasks": float(schedule.scheduled.sum()),
        "deferred_tasks": float((~schedule.scheduled).sum()),
        "downtime_minutes": float(sum(solver.Value(term) for term in downtime_terms)) if feasible else 0.0,
        "late_or_deferred_penalty_units": float(sum(solver.Value(term) for term in lateness_terms) + sum(solver.Value(term) for term in deferred_terms)) if feasible else 0.0,
        "conflict_penalty_units": 0.0,
    }
    return PlanningResult(
        status_name,
        solver.ObjectiveValue(),
        schedule,
        metrics,
        compatibility_analysis,
        graph_edges,
    )