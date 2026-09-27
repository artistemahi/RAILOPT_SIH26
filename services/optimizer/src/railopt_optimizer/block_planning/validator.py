"""Independent schedule validator.

Re-checks every hard constraint directly from the planning inputs, without
using the CP-SAT model, so a modelling bug cannot silently pass.
"""

from __future__ import annotations

from dataclasses import dataclass

from railopt_optimizer.block_planning.model import PlanningProblem, block_type_satisfies
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
    "NO_TRAIN_OVERLAP",
    "NO_SECTION_OVERLAP",
    "RESOURCE_CAPACITY",
    "DEPENDENCY_ORDER",
]


def validate(problem: PlanningProblem, assignments: list[Assignment]) -> ValidationReport:
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
        if task.section_id not in window.sections:
            violations.append(
                Violation("SECTION_COVERED", item.task_id, f"{window.window_id} does not cover {task.section_id}")
            )
        for train in problem.trains_by_section.get(task.section_id, []):
            if train.start < item.end and item.start < train.end:
                violations.append(
                    Violation("NO_TRAIN_OVERLAP", item.task_id, f"Overlaps train movement {train.movement_id}")
                )

    # One task at a time per section.
    by_section: dict[str, list[Assignment]] = {}
    for item in by_task.values():
        by_section.setdefault(problem.tasks[item.task_id].section_id, []).append(item)
    for section_id, items in by_section.items():
        items.sort(key=lambda item: item.start)
        for previous, current in zip(items, items[1:]):
            if current.start < previous.end:
                violations.append(
                    Violation(
                        "NO_SECTION_OVERLAP",
                        current.task_id,
                        f"Overlaps {previous.task_id} on {section_id}",
                    )
                )

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
