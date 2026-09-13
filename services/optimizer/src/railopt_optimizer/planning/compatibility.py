from __future__ import annotations

from collections import defaultdict
from itertools import combinations
from typing import Dict, Iterable, List

import pandas as pd


def _as_bool(value: object) -> bool:
    return str(value).strip().upper() in {"TRUE", "1", "YES", "Y"}


def _normalise_section(value: object) -> str:
    return str(value).replace("-", "").strip()


def _task_requirements(data: Dict[str, pd.DataFrame]) -> dict[str, list[dict]]:
    requirements = data["task_resources"]
    return {
        task_id: [row._asdict() for row in group.itertuples(index=False)]
        for task_id, group in requirements.groupby("task_id")
    }


def _candidate_windows(data: Dict[str, pd.DataFrame]) -> dict[str, list[dict]]:
    tasks = data["tasks"].set_index("task_id")
    blocks = data["blocks"].set_index("block_id")
    coverage = data["window_sections"].groupby("window_id")["section_id"].apply(set).to_dict()
    candidates: dict[str, list[dict]] = {task_id: [] for task_id in tasks.index}
    for row in data["windows"].itertuples(index=False):
        block = blocks.loc[row.block_id]
        if not _as_bool(row.available) or str(row.status).upper() == "UNAVAILABLE":
            continue
        if str(block.status).upper() != "AVAILABLE":
            continue
        sections = coverage.get(row.window_id, {_normalise_section(row.section_id)})
        for task_id, task in tasks.iterrows():
            if task.section_id not in sections:
                continue
            type_matches = task.required_block_type == row.block_type or row.block_type == "COMBINED_BLOCK"
            duration = int(task.estimated_duration_min)
            if type_matches and duration <= int(row.duration_min):
                candidates[task_id].append(
                    {
                        "window_id": row.window_id,
                        "block_id": row.block_id,
                        "block_type": row.block_type,
                        "section_id": task.section_id,
                    }
                )
    return candidates


def _dependency_map(data: Dict[str, pd.DataFrame]) -> dict[tuple[str, str], list[dict]]:
    result: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in data["dependencies"].itertuples(index=False):
        result[(row.predecessor_task_id, row.successor_task_id)].append(
            {
                "dependency_id": row.dependency_id,
                "predecessor": row.predecessor_task_id,
                "successor": row.successor_task_id,
                "type": row.dependency_type,
                "minimum_gap_min": int(row.minimum_gap_min),
                "mandatory": _as_bool(row.mandatory),
            }
        )
    return result


def _candidate_pairs(data: Dict[str, pd.DataFrame], task_ids: Iterable[str]) -> set[tuple[str, str]]:
    selected = set(task_ids)
    tasks = data["tasks"].set_index("task_id")
    requirements = _task_requirements(data)
    candidates = _candidate_windows(data)
    groups: dict[str, set[str]] = defaultdict(set)
    for task_id in selected:
        groups[f"section:{tasks.loc[task_id, 'section_id']}"] .add(task_id)
        for requirement in requirements.get(task_id, []):
            groups[f"resource:{requirement['resource_id']}"] .add(task_id)
        for candidate in candidates.get(task_id, []):
            groups[f"window:{candidate['window_id']}"] .add(task_id)
    for predecessor, successor in _dependency_map(data):
        if predecessor in selected and successor in selected:
            groups["dependency"].update((predecessor, successor))
    pairs: set[tuple[str, str]] = set()
    for group in groups.values():
        pairs.update(tuple(sorted(pair)) for pair in combinations(sorted(group), 2))
    return pairs


def _resource_check(first: str, second: str, resources: pd.DataFrame, requirements: dict[str, list[dict]]) -> dict:
    first_by_id = {item["resource_id"]: item for item in requirements.get(first, [])}
    second_by_id = {item["resource_id"]: item for item in requirements.get(second, [])}
    shared = sorted(set(first_by_id) & set(second_by_id))
    conflicts = []
    for resource_id in shared:
        capacity = int(resources.loc[resource_id, "capacity"])
        first_demand = int(first_by_id[resource_id]["quantity"])
        second_demand = int(second_by_id[resource_id]["quantity"])
        if first_demand + second_demand > capacity:
            conflicts.append(
                {
                    "resource_id": resource_id,
                    "capacity": capacity,
                    "task_i_quantity": first_demand,
                    "task_j_quantity": second_demand,
                }
            )
    if conflicts:
        result = "RESOURCE_CONFLICT"
        explanation = "Shared resource capacity is insufficient for overlapping execution."
    elif shared:
        result = "COMPATIBLE"
        explanation = "Shared resources have enough capacity for this pair; CP-SAT retains the cumulative constraint."
    else:
        result = "NOT_APPLICABLE"
        explanation = "The tasks do not require the same resource."
    return {"result": result, "shared_resources": shared, "conflicts": conflicts, "explanation": explanation}


def _dependency_check(first: str, second: str, dependencies: dict[tuple[str, str], list[dict]]) -> dict:
    links = dependencies.get((first, second), []) + dependencies.get((second, first), [])
    if links:
        return {
            "result": "PRECEDENCE",
            "dependencies": links,
            "explanation": "Dependency is precedence, not a conflict edge; CP-SAT enforces finish/start order.",
        }
    return {"result": "NOT_APPLICABLE", "dependencies": [], "explanation": "No dependency exists between the tasks."}


def _operational_check(data: Dict[str, pd.DataFrame]) -> dict:
    rules = data.get("compatibility_rules", pd.DataFrame())
    operational_rules = []
    if not rules.empty and "rule_category" in rules:
        operational_rules = rules.loc[rules.rule_category.eq("OPERATIONAL"), "rule_id"].tolist()
    return {
        "result": "NOT_APPLICABLE",
        "rules_considered": operational_rules,
        "explanation": "No explicit task-pair operational incompatibility rule is present in the dataset.",
    }


def _block_check(first: str, second: str, tasks: pd.DataFrame, candidates: dict[str, list[dict]]) -> dict:
    same_section = tasks.loc[first, "section_id"] == tasks.loc[second, "section_id"]
    first_by_window = {item["window_id"]: item for item in candidates.get(first, [])}
    second_by_window = {item["window_id"]: item for item in candidates.get(second, [])}
    shared_windows = sorted(set(first_by_window) & set(second_by_window))
    compatible_windows = [
        window_id
        for window_id in shared_windows
        if (
            tasks.loc[first, "required_block_type"] == tasks.loc[second, "required_block_type"]
            or first_by_window[window_id]["block_type"] == "COMBINED_BLOCK"
        )
    ]
    if same_section and not compatible_windows:
        return {
            "result": "BLOCK_INCOMPATIBILITY",
            "shared_windows": shared_windows,
            "compatible_windows": [],
            "explanation": "No available block/window can satisfy both task requirements in this section.",
        }
    return {
        "result": "COMPATIBLE" if compatible_windows else "NOT_APPLICABLE",
        "shared_windows": shared_windows,
        "compatible_windows": compatible_windows,
        "explanation": "A compatible block/window exists." if compatible_windows else "Different sections do not require a shared block/window.",
    }


def analyze_task_pairs(
    data: Dict[str, pd.DataFrame],
    task_ids: Iterable[str] | None = None,
    section_id: str | None = None,
) -> list[dict]:
    tasks = data["tasks"].set_index("task_id")
    selected = set(task_ids or tasks.index)
    selected &= set(tasks.index)
    if section_id is not None:
        selected = {task_id for task_id in selected if tasks.loc[task_id, "section_id"] == _normalise_section(section_id)}
    requirements = _task_requirements(data)
    candidates = _candidate_windows(data)
    dependencies = _dependency_map(data)
    task_table = data["tasks"].set_index("task_id")
    resource_table = data["resources"].set_index("resource_id")
    operational_check = _operational_check(data)
    results = []
    for first, second in sorted(_candidate_pairs(data, selected)):
        resource_check = _resource_check(first, second, resource_table, requirements)
        dependency_check = _dependency_check(first, second, dependencies)
        block_check = _block_check(first, second, task_table, candidates)
        conflict_types = []
        if resource_check["result"] == "RESOURCE_CONFLICT":
            conflict_types.append("RESOURCE_CONFLICT")
        if block_check["result"] == "BLOCK_INCOMPATIBILITY":
            conflict_types.append("BLOCK_INCOMPATIBILITY")
        final_result = "INCOMPATIBLE" if conflict_types else "COMPATIBLE"
        explanation_parts = [resource_check["explanation"], dependency_check["explanation"], block_check["explanation"]]
        results.append(
            {
                "task_i": first,
                "task_j": second,
                "resource_check": resource_check,
                "dependency_check": dependency_check,
                "operational_check": operational_check,
                "block_check": block_check,
                "final_result": final_result,
                "conflict_types": conflict_types,
                "explanation": " ".join(explanation_parts),
            }
        )
    return results


def conflict_edges(analyses: Iterable[dict]) -> list[dict]:
    return [
        {
            "source": result["task_i"],
            "target": result["task_j"],
            "conflict_types": result["conflict_types"],
            "reasons": result["conflict_types"],
            "explanation": result["explanation"],
            "analysis": result,
        }
        for result in analyses
        if result["final_result"] == "INCOMPATIBLE"
    ]