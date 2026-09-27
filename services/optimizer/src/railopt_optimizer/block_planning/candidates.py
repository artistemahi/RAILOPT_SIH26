"""Candidate window engine: which (task, window) pairs are worth optimising.

Every rejected pair keeps a reason so the planner can see why a task could
not be placed in a window. This is coarse feasibility only; CP-SAT decides
the actual placement.
"""

from __future__ import annotations

from dataclasses import dataclass

from railopt_optimizer.block_planning.model import (
    PlanningProblem,
    Task,
    Window,
    block_type_satisfies,
)


@dataclass(frozen=True)
class Candidate:
    task_id: str
    window_id: str
    duration: int
    # Train-free stretches (start, end) inside the window on the task's
    # section that are at least `duration` long.
    gaps: tuple[tuple[int, int], ...] = ()


@dataclass(frozen=True)
class Rejection:
    task_id: str
    window_id: str | None
    code: str
    message: str


@dataclass
class CandidateResult:
    candidates: list[Candidate]
    rejections: list[Rejection]

    def by_task(self) -> dict[str, list[Candidate]]:
        grouped: dict[str, list[Candidate]] = {}
        for candidate in self.candidates:
            grouped.setdefault(candidate.task_id, []).append(candidate)
        return grouped


def train_free_gaps(
    problem: PlanningProblem, section_id: str, window: Window
) -> list[tuple[int, int]]:
    """Stretches inside the window with no train movement on the section."""
    gaps: list[tuple[int, int]] = []
    cursor = window.start
    for train in problem.trains_by_section.get(section_id, []):
        if train.end <= cursor or train.start >= window.end:
            continue
        if train.start > cursor:
            gaps.append((cursor, min(train.start, window.end)))
        cursor = max(cursor, train.end)
    if cursor < window.end:
        gaps.append((cursor, window.end))
    return gaps


def longest_train_free_gap(problem: PlanningProblem, section_id: str, window: Window) -> int:
    return max((end - start for start, end in train_free_gaps(problem, section_id, window)), default=0)


def section_problem(problem: PlanningProblem, task: Task) -> tuple[str, str] | None:
    section = problem.sections.get(task.section_id)
    if section is None:
        return None
    # RULE_050: inactive sections need separate handling.
    if section.operational_status and section.operational_status != "ACTIVE":
        return ("SECTION_INACTIVE", f"{task.section_id} is {section.operational_status.lower()}")
    # RULE_049: electrical (TRD) work requires an electrified section.
    if task.department.upper() == "TRD" and section.electrified is False:
        return ("NOT_ELECTRIFIED", f"TRD work needs an electrified section; {task.section_id} is not")
    return None


def resource_problem(problem: PlanningProblem, task: Task, window: Window) -> str | None:
    for need in problem.needs.get(task.task_id, []):
        resource = problem.resources.get(need.resource_id)
        if resource is None:
            return f"mandatory resource {need.resource_id} is not in the resource list"
        if not resource.available:
            return f"mandatory resource {need.resource_id} is unavailable"
        if need.quantity > resource.capacity:
            return (
                f"needs {need.quantity} of {need.resource_id}, capacity is {resource.capacity}"
            )
        # RULE_012: resource skill must meet the required skill.
        if need.required_skill and resource.skill < need.required_skill:
            return f"{need.resource_id} skill L{resource.skill} is below required L{need.required_skill}"
        # RULE_014: resource department must match the task department.
        if resource.department and task.department and resource.department != task.department:
            return f"{need.resource_id} belongs to {resource.department}, task is {task.department}"
        if resource.start > window.start or resource.end < window.end:
            return f"{need.resource_id} is not available for the whole window"
    return None


def generate_candidates(problem: PlanningProblem) -> CandidateResult:
    candidates: list[Candidate] = []
    rejections: list[Rejection] = []
    windows_by_block: dict[str, list[Window]] = {}
    for window in problem.windows.values():
        windows_by_block.setdefault(window.block_id, []).append(window)

    requirements_by_task: dict[str, list] = {}
    for requirement in problem.requirements:
        requirements_by_task.setdefault(requirement.task_id, []).append(requirement)

    for task in problem.tasks.values():
        requirements = requirements_by_task.get(task.task_id, [])
        if not requirements:
            rejections.append(
                Rejection(task.task_id, None, "NO_REQUIREMENT", "Task has no block requirement")
            )
            continue

        task_level = section_problem(problem, task)
        if task_level:
            rejections.append(Rejection(task.task_id, None, *task_level))
            continue

        found_window = False
        for requirement in requirements:
            for window in windows_by_block.get(requirement.block_id, []):
                found_window = True
                reason: tuple[str, str] | None = None
                if not window.available:
                    reason = ("WINDOW_UNAVAILABLE", f"Window is {window.status.lower() or 'unavailable'}")
                elif not block_type_satisfies(requirement.required_block_type, window.block_type):
                    reason = (
                        "BLOCK_TYPE_MISMATCH",
                        f"Needs {requirement.required_block_type}, window is {window.block_type}",
                    )
                elif task.section_id not in window.sections:
                    reason = ("SECTION_NOT_COVERED", f"Window does not cover {task.section_id}")
                elif requirement.required_minutes > problem.block_max_minutes.get(
                    window.block_id, requirement.required_minutes
                ):
                    reason = (
                        "BLOCK_CAPACITY",
                        f"Task needs {requirement.required_minutes} min; block {window.block_id} "
                        f"allows {problem.block_max_minutes[window.block_id]} min",
                    )
                elif requirement.required_minutes > window.duration:
                    reason = (
                        "WINDOW_TOO_SHORT",
                        f"Window is {window.duration} min; task needs "
                        f"{requirement.required_minutes} min incl. setup and release",
                    )
                elif (problem_text := resource_problem(problem, task, window)) is not None:
                    reason = ("RESOURCE_UNAVAILABLE", problem_text.capitalize())
                else:
                    gaps = tuple(
                        gap
                        for gap in train_free_gaps(problem, task.section_id, window)
                        if gap[1] - gap[0] >= requirement.required_minutes
                    )
                    if not gaps:
                        reason = (
                            "TRAIN_CONFLICT",
                            f"Longest train-free gap on {task.section_id} is "
                            f"{longest_train_free_gap(problem, task.section_id, window)} min; "
                            f"task needs {requirement.required_minutes} min",
                        )

                if reason:
                    rejections.append(Rejection(task.task_id, window.window_id, *reason))
                else:
                    candidates.append(
                        Candidate(task.task_id, window.window_id, requirement.required_minutes, gaps)
                    )

        if not found_window:
            rejections.append(
                Rejection(
                    task.task_id,
                    None,
                    "NO_WINDOW_IN_HORIZON",
                    "No window for the required block in the planning horizon",
                )
            )

    return CandidateResult(candidates=candidates, rejections=rejections)
