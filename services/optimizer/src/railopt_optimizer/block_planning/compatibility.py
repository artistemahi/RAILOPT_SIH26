"""Compatibility / conflict engine for task pairs.

Builds a NetworkX graph over tasks that have at least one candidate window.
Edges carry the dataset compatibility rule that relates the two tasks:

    SHARED_RESOURCE   RULE_011  share a mandatory resource: cannot overlap
                                (enforced through cumulative capacity)
    SAME_ASSET        RAILOPT   two jobs on one asset: cannot overlap
                                (project assumption, not a dataset rule)
    DEPENDENCY        RULE_016  mandatory finish-to-start dependency
    TASK_TYPE_ORDER   RULE_032  repair / replacement before testing on the
                      RULE_033  same asset
    COORDINATION      RULE_001  same section, no conflict above, share a
                      RULE_034  candidate window: may work at the same time

Anything not joined by a conflict edge may overlap in time; section
occupancy by trains and resource capacity still apply.
"""

from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations

import networkx as nx

from railopt_optimizer.block_planning.candidates import CandidateResult
from railopt_optimizer.block_planning.model import PlanningProblem

CONFLICT_TYPES = ("SHARED_RESOURCE", "SAME_ASSET", "DEPENDENCY", "TASK_TYPE_ORDER")
ORDER_BEFORE_TESTING = {"REPAIR", "REPLACEMENT"}
MAX_REPORTED_CYCLES = 10


@dataclass
class CompatibilityResult:
    graph: nx.MultiGraph
    same_asset_groups: dict[str, list[str]]
    type_orders: list[tuple[str, str]]  # (first, then) on the same asset
    dependency_cycles: list[list[str]]
    deadline_conflicts: list[dict]

    def edge_counts(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for _, _, data in self.graph.edges(data=True):
            counts[data["kind"]] = counts.get(data["kind"], 0) + 1
        return counts

    def conflicting(self, a: str, b: str) -> list[str]:
        if not self.graph.has_edge(a, b):
            return []
        return [
            data["kind"]
            for data in self.graph.get_edge_data(a, b).values()
            if data["kind"] in CONFLICT_TYPES
        ]


def build_compatibility(
    problem: PlanningProblem, candidates: CandidateResult
) -> CompatibilityResult:
    graph = nx.MultiGraph()
    planned = set(candidates.by_task())
    graph.add_nodes_from(planned)

    # RULE_011: shared mandatory resource.
    by_resource: dict[str, list[str]] = {}
    for task_id in planned:
        for need in problem.needs.get(task_id, []):
            by_resource.setdefault(need.resource_id, []).append(task_id)
    for resource_id, task_ids in by_resource.items():
        for a, b in combinations(sorted(task_ids), 2):
            graph.add_edge(a, b, kind="SHARED_RESOURCE", rule="RULE_011", detail=resource_id)

    # Same asset: never two jobs at once; repair/replacement before testing.
    by_asset: dict[str, list[str]] = {}
    for task_id in planned:
        asset_id = problem.tasks[task_id].asset_id
        if asset_id:
            by_asset.setdefault(asset_id, []).append(task_id)
    same_asset_groups = {asset: sorted(ids) for asset, ids in by_asset.items() if len(ids) > 1}
    type_orders: list[tuple[str, str]] = []
    for asset_id, task_ids in same_asset_groups.items():
        for a, b in combinations(task_ids, 2):
            graph.add_edge(a, b, kind="SAME_ASSET", rule="RAILOPT", detail=asset_id)
            type_a, type_b = problem.tasks[a].task_type, problem.tasks[b].task_type
            if type_a in ORDER_BEFORE_TESTING and type_b == "TESTING":
                type_orders.append((a, b))
            elif type_b in ORDER_BEFORE_TESTING and type_a == "TESTING":
                type_orders.append((b, a))
    for first, then in type_orders:
        rule = "RULE_032" if problem.tasks[first].task_type == "REPAIR" else "RULE_033"
        graph.add_edge(first, then, kind="TASK_TYPE_ORDER", rule=rule, detail=f"{first} before {then}")

    # RULE_016: mandatory dependencies between planned tasks.
    for dependency in problem.dependencies:
        if dependency.predecessor in planned and dependency.successor in planned:
            graph.add_edge(
                dependency.predecessor,
                dependency.successor,
                kind="DEPENDENCY",
                rule="RULE_016",
                detail=f"gap {dependency.gap} min",
            )

    # RULE_001 / RULE_034: coordination opportunities on a shared window.
    windows_by_task = {
        task_id: {option.window_id for option in options}
        for task_id, options in candidates.by_task().items()
    }
    by_section: dict[str, list[str]] = {}
    for task_id in planned:
        by_section.setdefault(problem.tasks[task_id].section_id, []).append(task_id)
    for section_id, task_ids in by_section.items():
        for a, b in combinations(sorted(task_ids), 2):
            if graph.has_edge(a, b):
                continue
            shared = windows_by_task[a] & windows_by_task[b]
            if shared:
                graph.add_edge(
                    a, b, kind="COORDINATION", rule="RULE_001", detail=sorted(shared)[0]
                )

    # RULE_020: the dependency graph must be acyclic (all pending tasks).
    dependency_graph = nx.DiGraph()
    for dependency in problem.dependencies:
        if dependency.predecessor in problem.tasks and dependency.successor in problem.tasks:
            dependency_graph.add_edge(dependency.predecessor, dependency.successor)
    dependency_cycles = []
    for cycle in nx.simple_cycles(dependency_graph):
        dependency_cycles.append(cycle)
        if len(dependency_cycles) >= MAX_REPORTED_CYCLES:
            break

    # RULE_019: a successor should not be due before its predecessor.
    deadline_conflicts = []
    for dependency in problem.dependencies:
        before = problem.tasks.get(dependency.predecessor)
        after = problem.tasks.get(dependency.successor)
        if before and after and before.due_date and after.due_date and after.due_date < before.due_date:
            deadline_conflicts.append(
                {
                    "predecessor": before.task_id,
                    "successor": after.task_id,
                    "predecessor_due": before.due_date,
                    "successor_due": after.due_date,
                }
            )

    return CompatibilityResult(
        graph=graph,
        same_asset_groups=same_asset_groups,
        type_orders=type_orders,
        dependency_cycles=dependency_cycles,
        deadline_conflicts=deadline_conflicts,
    )
