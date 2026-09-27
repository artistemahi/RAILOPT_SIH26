"""Independent schedule validator.

Re-checks every hard constraint directly from the planning inputs, without
using the CP-SAT model or the compatibility engine, so a modelling bug cannot
silently pass.
"""

from __future__ import annotations

from dataclasses import dataclass

from railopt_optimizer.block_planning.model import PlanningProblem, block_type_satisfies

ORDER_BEFORE_TESTING = {"REPAIR", "REPLACEMENT"}
from railopt_optimizer.block_planning.solver import Assignment


@dataclass(frozen=True)
class Violation:
    check: str
    task_id: str
    message: str


@dataclass
class ValidationReport:
    checks: list[str]
    violations: list[Violation]

    @property
    def passed(self) -> bool:
        return not self.violations


CHECKS = [
    "TASK_ONCE",
    "WINDOW_VALID",
    "WITHIN_WINDOW",
    "DURATION",
    "SECTION_COVERED",
    "SECTION_STATUS",
    "BLOCK_CAPACITY",
    "NO_TRAIN_OVERLAP",
    "NO_ASSET_OVERLAP",
    "TASK_TYPE_ORDER",
    "RESOURCE_MATCH",
    "RESOURCE_CAPACITY",
    "DEPENDENCY_ORDER",
]


def validate(
    problem: PlanningProblem,
    assignments: list[Assignment],
    section_exclusive: bool = False,
) -> ValidationReport:
    violations: list[Violation] = []
    by_task: dict[str, Assignment] = {}

    required = {
        (requirement.task_id, requirement.block_id): requirement
        for requirement in problem.requirements
    }

    for item in assignments:
        if item.task_id in by_task:
            violations.append(Violation("TASK_ONCE", item.task_id, "Task placed more than once"))
        by_task[item.task_id] = item

        task = problem.tasks.get(item.task_id)
        window = problem.windows.get(item.window_id)
        if task is None or window is None:
            violations.append(Violation("WINDOW_VALID", item.task_id, "Unknown task or window"))
            continue
        requirement = required.get((task.task_id, window.block_id))
        if not window.available or requirement is None:
            violations.append(
                Violation("WINDOW_VALID", item.task_id, f"{window.window_id} is not a valid window for this task")
            )
        if requirement and not block_type_satisfies(requirement.required_block_type, window.block_type):
            violations.append(Violation("WINDOW_VALID", item.task_id, "Block type mismatch"))
        if item.start < window.start or item.end > window.end:
            violations.append(Violation("WITHIN_WINDOW", item.task_id, "Outside window time"))
        if requirement and item.end - item.start != requirement.required_minutes:
            violations.append(
                Violation("DURATION", item.task_id, "Duration differs from requirement incl. setup/release")
            )
        section = problem.sections.get(task.section_id)
        if section and (
            (section.operational_status and section.operational_status != "ACTIVE")
            or (task.department.upper() == "TRD" and section.electrified is False)
        ):
            violations.append(
                Violation("SECTION_STATUS", item.task_id, f"{task.section_id} does not permit this work")
            )
        max_minutes = problem.block_max_minutes.get(window.block_id)
        if max_minutes is not None and item.end - item.start > max_minutes:
            violations.append(
                Violation("BLOCK_CAPACITY", item.task_id, f"Exceeds {window.block_id} max {max_minutes} min")
            )
        for need in problem.needs.get(task.task_id, []):
            resource = problem.resources.get(need.resource_id)
            if (
                resource is None
                or not resource.available
                or (need.required_skill and resource.skill < need.required_skill)
                or (resource.department and task.department and resource.department != task.department)
                or resource.start > item.start
                or resource.end < item.end
            ):
                violations.append(
                    Violation("RESOURCE_MATCH", item.task_id, f"{need.resource_id} cannot serve this task")
                )
        if task.section_id not in window.sections:
            violations.append(
                Violation("SECTION_COVERED", item.task_id, f"{window.window_id} does not cover {task.section_id}")
            )
        for train in problem.trains_by_section.get(task.section_id, []):
            if train.start < item.end and item.start < train.end:
                violations.append(
                    Violation("NO_TRAIN_OVERLAP", item.task_id, f"Overlaps train movement {train.movement_id}")
                )

    def overlapping(items: list[Assignment], check: str, label: str) -> None:
        items.sort(key=lambda item: item.start)
        for index, current in enumerate(items):
            for previous in items[:index]:
                if current.start < previous.end:
                    violations.append(
                        Violation(check, current.task_id, f"Overlaps {previous.task_id} on {label}")
                    )

    # Never two jobs on one asset at the same time.
    by_asset: dict[str, list[Assignment]] = {}
    for item in by_task.values():
        asset_id = problem.tasks[item.task_id].asset_id
        if asset_id:
            by_asset.setdefault(asset_id, []).append(item)
    for asset_id, items in by_asset.items():
        overlapping(items, "NO_ASSET_OVERLAP", asset_id)
        # Repair / replacement before testing on the same asset.
        for first in items:
            for then in items:
                if (
                    problem.tasks[first.task_id].task_type in ORDER_BEFORE_TESTING
                    and problem.tasks[then.task_id].task_type == "TESTING"
                    and then.start < first.end
                ):
                    violations.append(
                        Violation("TASK_TYPE_ORDER", then.task_id, f"Testing starts before {first.task_id} ends")
                    )

    if section_exclusive:
        by_section: dict[str, list[Assignment]] = {}
        for item in by_task.values():
            by_section.setdefault(problem.tasks[item.task_id].section_id, []).append(item)
        for section_id, items in by_section.items():
            overlapping(items, "SECTION_EXCLUSIVE", section_id)

    # Resource capacity at every start event.
    usage: dict[str, list[tuple[Assignment, int]]] = {}
    for item in by_task.values():
        for need in problem.needs.get(item.task_id, []):
            usage.setdefault(need.resource_id, []).append((item, need.quantity))
    for resource_id, uses in usage.items():
        capacity = problem.resources[resource_id].capacity
        for item, _ in uses:
            load = sum(q for other, q in uses if other.start <= item.start < other.end)
            if load > capacity:
                violations.append(
                    Violation(
                        "RESOURCE_CAPACITY",
                        item.task_id,
                        f"{resource_id} load {load} exceeds capacity {capacity}",
                    )
                )

    # Mandatory dependencies between planned tasks.
    for dependency in problem.dependencies:
        successor = by_task.get(dependency.successor)
        if successor is None or dependency.predecessor not in problem.tasks:
            continue
        predecessor = by_task.get(dependency.predecessor)
        if predecessor is None:
            violations.append(
                Violation(
                    "DEPENDENCY_ORDER",
                    successor.task_id,
                    f"Predecessor {dependency.predecessor} is not planned",
                )
            )
        elif successor.start < predecessor.end + dependency.gap:
            violations.append(
                Violation(
                    "DEPENDENCY_ORDER",
                    successor.task_id,
                    f"Starts before {dependency.predecessor} ends + {dependency.gap} min",
                )
            )

    return ValidationReport(checks=CHECKS, violations=violations)
