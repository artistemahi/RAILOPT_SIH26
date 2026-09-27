"""Planning inputs normalised to integer minutes from the horizon start."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta


COMBINED_BLOCK = "COMBINED_BLOCK"


def block_type_satisfies(required: str, offered: str) -> bool:
    """
    A window satisfies a requirement when the types match, or when it is a
    combined block. The dataset's block_requirements link power, traffic and
    signal tasks to combined blocks, so a combined possession is treated as
    covering every block type.
    """
    return required == offered or offered == COMBINED_BLOCK


def merge_occupations(occupations: list["Occupation"]) -> list["Occupation"]:
    """Union of overlapping train occupations on one section."""
    merged: list[Occupation] = []
    for item in sorted(occupations, key=lambda o: o.start):
        if merged and item.start <= merged[-1].end:
            last = merged[-1]
            merged[-1] = Occupation(
                f"{last.movement_id}+{item.movement_id}",
                last.section_id,
                last.start,
                max(last.end, item.end),
            )
        else:
            merged.append(item)
    return merged


def parse_time(value: str) -> datetime:
    """Parse an ISO-like timestamp ('2026-09-14 04:00:00' or with 'T')."""
    return datetime.fromisoformat(value.replace("Z", "").replace("T", " ").strip())


@dataclass(frozen=True)
class Window:
    window_id: str
    block_id: str
    block_type: str
    start: int
    end: int
    available: bool
    status: str
    sections: frozenset[str]

    @property
    def duration(self) -> int:
        return self.end - self.start


@dataclass(frozen=True)
class Task:
    task_id: str
    section_id: str
    department: str
    priority_score: float


@dataclass(frozen=True)
class Requirement:
    task_id: str
    block_id: str
    required_block_type: str
    required_minutes: int


@dataclass(frozen=True)
class Resource:
    resource_id: str
    capacity: int
    available: bool
    start: int
    end: int


@dataclass(frozen=True)
class ResourceNeed:
    resource_id: str
    quantity: int


@dataclass(frozen=True)
class Dependency:
    predecessor: str
    successor: str
    gap: int


@dataclass(frozen=True)
class Occupation:
    """A fixed interval when a section is occupied by a train movement."""

    movement_id: str
    section_id: str
    start: int
    end: int


@dataclass
class PlanningProblem:
    horizon_start: datetime
    horizon_end: int
    tasks: dict[str, Task]
    windows: dict[str, Window]
    requirements: list[Requirement]
    resources: dict[str, Resource]
    needs: dict[str, list[ResourceNeed]]
    dependencies: list[Dependency]
    trains_by_section: dict[str, list[Occupation]] = field(default_factory=dict)

    def to_clock(self, minute: int) -> str:
        return (self.horizon_start + timedelta(minutes=minute)).strftime("%Y-%m-%d %H:%M")


def build_problem(payload: dict) -> PlanningProblem:
    """Convert the API payload into minute-based planning objects."""
    horizon_start = datetime.fromisoformat(payload["horizon_start"])
    horizon_end = int(payload["horizon_days"]) * 24 * 60

    def minutes(value: str) -> int:
        return int((parse_time(value) - horizon_start).total_seconds() // 60)

    tasks = {
        row["task_id"]: Task(
            task_id=row["task_id"],
            section_id=row["section_id"],
            department=row.get("department") or "",
            priority_score=float(row.get("priority_score") or 0),
        )
        for row in payload["tasks"]
    }

    windows = {}
    for row in payload["windows"]:
        start, end = minutes(row["start_time"]), minutes(row["end_time"])
        if end <= 0 or start >= horizon_end:
            continue
        windows[row["window_id"]] = Window(
            window_id=row["window_id"],
            block_id=row["block_id"],
            block_type=row["block_type"],
            start=start,
            end=end,
            available=bool(row["available"]),
            status=row.get("status") or "",
            sections=frozenset(row.get("sections") or [row.get("section_id")]),
        )

    requirements = [
        Requirement(
            task_id=row["task_id"],
            block_id=row["block_id"],
            required_block_type=row.get("required_block_type") or "",
            required_minutes=int(row.get("minimum_block_duration_min") or 0)
            + int(row.get("setup_duration_min") or 0)
            + int(row.get("release_duration_min") or 0),
        )
        for row in payload["requirements"]
        if row["task_id"] in tasks
    ]

    resources = {}
    for row in payload["resources"]:
        start = minutes(row["availability_start"]) if row.get("availability_start") else 0
        end = minutes(row["availability_end"]) if row.get("availability_end") else horizon_end
        resources[row["resource_id"]] = Resource(
            resource_id=row["resource_id"],
            capacity=int(row.get("capacity") or 0),
            available=(row.get("status") or "").upper() == "AVAILABLE",
            start=start,
            end=end,
        )

    needs: dict[str, list[ResourceNeed]] = {}
    for row in payload["task_resources"]:
        if row["task_id"] in tasks and row.get("mandatory"):
            needs.setdefault(row["task_id"], []).append(
                ResourceNeed(row["resource_id"], int(row.get("quantity") or 1))
            )

    dependencies = [
        Dependency(
            predecessor=row["predecessor_task_id"],
            successor=row["successor_task_id"],
            gap=int(row.get("minimum_gap_min") or 0),
        )
        for row in payload["dependencies"]
        if row.get("mandatory")
    ]

    trains_by_section: dict[str, list[Occupation]] = {}
    for row in payload["trains"]:
        start, end = minutes(row["entry_time"]), minutes(row["exit_time"])
        if end <= 0 or start >= horizon_end:
            continue
        trains_by_section.setdefault(row["section_id"], []).append(
            Occupation(row["movement_id"], row["section_id"], start, end)
        )
    for occupations in trains_by_section.values():
        occupations.sort(key=lambda item: item.start)

    return PlanningProblem(
        horizon_start=horizon_start,
        horizon_end=horizon_end,
        tasks=tasks,
        windows=windows,
        requirements=requirements,
        resources=resources,
        needs=needs,
        dependencies=dependencies,
        trains_by_section=trains_by_section,
    )
