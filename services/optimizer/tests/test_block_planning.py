"""Small hand-built scenarios for the block planner.

Horizon starts 2026-09-14 00:00; W1 is 02:00-05:00 on SEC_A (180 min).
"""

import copy

import pytest

from railopt_optimizer.block_planning.service import plan_blocks

BASE = {
    "horizon_start": "2026-09-14",
    "horizon_days": 1,
    "time_limit_seconds": 5,
    "tasks": [
        {"task_id": "T1", "section_id": "SEC_A", "department": "S&T", "priority_score": 90},
        {"task_id": "T2", "section_id": "SEC_A", "department": "TRD", "priority_score": 70},
    ],
    "windows": [
        {
            "window_id": "W1",
            "block_id": "B1",
            "block_type": "TRAFFIC_BLOCK",
            "sections": ["SEC_A"],
            "start_time": "2026-09-14 02:00:00",
            "end_time": "2026-09-14 05:00:00",
            "available": True,
            "status": "AVAILABLE",
        }
    ],
    "requirements": [
        {"task_id": "T1", "block_id": "B1", "required_block_type": "TRAFFIC_BLOCK",
         "minimum_block_duration_min": 60, "setup_duration_min": 10, "release_duration_min": 5},
        {"task_id": "T2", "block_id": "B1", "required_block_type": "TRAFFIC_BLOCK",
         "minimum_block_duration_min": 60, "setup_duration_min": 10, "release_duration_min": 5},
    ],
    "resources": [
        {"resource_id": "R1", "capacity": 1, "status": "AVAILABLE",
         "availability_start": "2026-09-14 00:00:00", "availability_end": "2026-09-14 23:59:00"}
    ],
    "task_resources": [],
    "dependencies": [],
    "trains": [],
}


def scenario(**changes):
    data = copy.deepcopy(BASE)
    data.update(changes)
    return data


def by_task(result):
    return {item["task_id"]: item for item in result["assignments"]}


def test_compatible_departments_coordinate_on_one_section():
    # T1 (S&T) and T2 (TRD): same section, no shared resource or asset.
    result = plan_blocks(scenario())
    assert result["solver"]["status"] == "OPTIMAL"
    assert result["validation"]["passed"]
    placed = by_task(result)
    assert placed["T1"]["start_minute"] == placed["T2"]["start_minute"] == 120
    assert result["coordination"]["multi_department_pairs"] == 1
    assert result["compatibility"]["edges_by_type"] == {"COORDINATION": 1}


def test_same_asset_work_never_overlaps_and_higher_priority_goes_first():
    data = scenario()
    for task in data["tasks"]:
        task["asset_id"] = "A1"
    result = plan_blocks(data)
    placed = by_task(result)
    assert result["validation"]["passed"]
    assert placed["T1"]["start_minute"] == 120
    assert placed["T2"]["start_minute"] >= placed["T1"]["end_minute"]


def test_repair_precedes_testing_on_the_same_asset():
    # T1 is testing with higher priority; repair T2 must still go first.
    data = scenario()
    data["tasks"][0].update(asset_id="A1", task_type="TESTING")
    data["tasks"][1].update(asset_id="A1", task_type="REPAIR")
    result = plan_blocks(data)
    placed = by_task(result)
    assert result["validation"]["passed"]
    assert placed["T1"]["start_minute"] >= placed["T2"]["end_minute"]
    assert result["compatibility"]["task_type_orders"] == 1


def test_compare_modes_reports_section_exclusive_baseline():
    result = plan_blocks(scenario(compare_modes=True))
    comparison = result["comparison"]
    assert comparison["section_exclusive"]["validation_passed"]
    assert comparison["coordinated"]["tasks_scheduled"] == 2
    assert comparison["section_exclusive"]["tasks_scheduled"] == 2


def test_window_too_short_is_rejected_with_reason():
    data = scenario()
    data["requirements"][0]["minimum_block_duration_min"] = 200
    result = plan_blocks(data)
    assert "T1" not in by_task(result)
    reason = next(u for u in result["unscheduled"] if u["task_id"] == "T1")
    assert reason["reason_code"] == "WINDOW_TOO_SHORT"


def test_trains_block_work_on_their_section():
    # Trains at 02:30-03:00 and 04:00-04:30 leave no 75-minute gap.
    data = scenario(trains=[
        {"movement_id": "M1", "section_id": "SEC_A", "entry_time": "2026-09-14 02:30:00", "exit_time": "2026-09-14 03:00:00"},
        {"movement_id": "M2", "section_id": "SEC_A", "entry_time": "2026-09-14 04:00:00", "exit_time": "2026-09-14 04:30:00"},
    ])
    result = plan_blocks(data)
    assert result["assignments"] == []
    assert {u["reason_code"] for u in result["unscheduled"]} == {"TRAIN_CONFLICT"}


def test_shared_resource_capacity_is_respected_across_sections():
    data = scenario(task_resources=[
        {"task_id": "T1", "resource_id": "R1", "quantity": 1, "mandatory": True},
        {"task_id": "T2", "resource_id": "R1", "quantity": 1, "mandatory": True},
    ])
    data["tasks"][1]["section_id"] = "SEC_B"
    data["windows"][0]["sections"] = ["SEC_A", "SEC_B"]
    result = plan_blocks(data)
    placed = by_task(result)
    assert result["validation"]["passed"]
    assert set(placed) == {"T1", "T2"}
    a, b = placed["T1"], placed["T2"]
    assert a["end_minute"] <= b["start_minute"] or b["end_minute"] <= a["start_minute"]


def test_unavailable_mandatory_resource_rejects_task():
    data = scenario(task_resources=[{"task_id": "T2", "resource_id": "R1", "quantity": 1, "mandatory": True}])
    data["resources"][0]["status"] = "UNAVAILABLE"
    result = plan_blocks(data)
    assert set(by_task(result)) == {"T1"}
    reason = next(u for u in result["unscheduled"] if u["task_id"] == "T2")
    assert reason["reason_code"] == "RESOURCE_UNAVAILABLE"


def test_dependency_orders_tasks_with_gap():
    # T2 (lower priority) must finish 30 min before T1 starts.
    data = scenario(dependencies=[
        {"predecessor_task_id": "T2", "successor_task_id": "T1", "minimum_gap_min": 30, "mandatory": True}
    ])
    data["tasks"][1]["section_id"] = "SEC_B"
    data["windows"][0]["sections"] = ["SEC_A", "SEC_B"]
    result = plan_blocks(data)
    placed = by_task(result)
    assert result["validation"]["passed"]
    assert placed["T1"]["start_minute"] >= placed["T2"]["end_minute"] + 30


def test_successor_not_planned_without_predecessor():
    data = scenario(dependencies=[
        {"predecessor_task_id": "T2", "successor_task_id": "T1", "minimum_gap_min": 0, "mandatory": True}
    ])
    data["requirements"][1]["minimum_block_duration_min"] = 500  # T2 cannot fit anywhere
    result = plan_blocks(data)
    assert result["assignments"] == []
    reasons = {u["task_id"]: u["reason_code"] for u in result["unscheduled"]}
    assert reasons["T1"] == "DEPENDENCY_BLOCKED"


def test_validator_catches_a_bad_schedule():
    from railopt_optimizer.block_planning.model import build_problem
    from railopt_optimizer.block_planning.solver import Assignment
    from railopt_optimizer.block_planning.validator import validate

    data = scenario()
    for task in data["tasks"]:
        task["asset_id"] = "A1"
    problem = build_problem(data)
    bad = [Assignment("T1", "W1", 120, 195), Assignment("T2", "W1", 150, 225)]
    report = validate(problem, bad)
    assert not report.passed
    assert {v.check for v in report.violations} == {"NO_ASSET_OVERLAP"}
    exclusive = validate(build_problem(scenario()), bad, section_exclusive=True)
    assert {v.check for v in exclusive.violations} == {"SECTION_EXCLUSIVE"}


@pytest.mark.parametrize("available", [False])
def test_unavailable_window_is_never_used(available):
    data = scenario()
    data["windows"][0]["available"] = available
    data["windows"][0]["status"] = "UNAVAILABLE"
    result = plan_blocks(data)
    assert result["assignments"] == []
    assert {u["reason_code"] for u in result["unscheduled"]} == {"WINDOW_UNAVAILABLE"}


def test_overlapping_trains_on_one_section_stay_feasible():
    # Two trains overlap each other (multi-track); work must avoid their union.
    data = scenario(trains=[
        {"movement_id": "M1", "section_id": "SEC_A", "entry_time": "2026-09-14 02:00:00", "exit_time": "2026-09-14 02:30:00"},
        {"movement_id": "M2", "section_id": "SEC_A", "entry_time": "2026-09-14 02:15:00", "exit_time": "2026-09-14 02:45:00"},
    ])
    result = plan_blocks(data)
    assert result["solver"]["status"] == "OPTIMAL"
    assert result["validation"]["passed"]
    assert all(a["start_minute"] >= 165 for a in result["assignments"])


def test_combined_block_window_serves_any_block_type():
    data = scenario()
    data["windows"][0]["block_type"] = "COMBINED_BLOCK"
    data["requirements"][0]["required_block_type"] = "POWER_BLOCK"
    result = plan_blocks(data)
    assert "T1" in by_task(result)
    assert result["validation"]["passed"]


def test_resource_skill_and_department_are_checked():
    data = scenario(task_resources=[
        {"task_id": "T1", "resource_id": "R1", "quantity": 1, "mandatory": True, "required_skill": "L3"},
    ])
    data["resources"][0].update(skills="L1", department="S&T")
    result = plan_blocks(data)
    reason = next(u for u in result["unscheduled"] if u["task_id"] == "T1")
    assert reason["reason_code"] == "RESOURCE_UNAVAILABLE"
    assert "skill" in reason["example"]


def test_dependency_cycle_and_deadline_conflict_are_reported():
    data = scenario(dependencies=[
        {"predecessor_task_id": "T1", "successor_task_id": "T2", "minimum_gap_min": 0, "mandatory": True},
        {"predecessor_task_id": "T2", "successor_task_id": "T1", "minimum_gap_min": 0, "mandatory": True},
    ])
    data["tasks"][0]["due_date"] = "2026-09-20"
    data["tasks"][1]["due_date"] = "2026-09-18"
    result = plan_blocks(data)
    compatibility = result["compatibility"]
    assert len(compatibility["dependency_cycles"]) == 1
    assert len(compatibility["deadline_conflicts"]) == 1
    assert result["assignments"] == []  # a cycle can never be satisfied
    assert result["validation"]["passed"]


def test_include_details_lists_candidates_rejections_and_edges():
    data = scenario(include_details=True)
    data["requirements"][0]["minimum_block_duration_min"] = 200
    result = plan_blocks(data)
    details = {row["task_id"]: row for row in result["task_details"]}
    assert details["T1"]["candidate_windows"] == []
    assert details["T1"]["rejections"] == {"WINDOW_TOO_SHORT": 1}
    assert details["T1"]["scheduled_window"] is None
    assert details["T2"]["scheduled_window"] in details["T2"]["candidate_windows"]
    assert all(set(edge) == {"a", "b", "kind", "rule", "detail"} for edge in result["compatibility_edges"])
    assert "task_details" not in plan_blocks(scenario())


def test_asset_downtime_counts_work_in_one_window_as_one_outage():
    data = scenario()
    for task in data["tasks"]:
        task["asset_id"] = "A1"
    result = plan_blocks(data)
    downtime = result["asset_downtime"]
    assert downtime["assets_worked"] == 1
    assert downtime["total_downtime_minutes"] == 150  # two 75-minute jobs
    assert downtime["outages"] == 1
    assert downtime["bundled_assets"] == 1


def test_p1_band_follows_the_threshold_sent_by_the_api():
    # T1 scores 90, T2 scores 70.
    assert plan_blocks(scenario())["kpis"]["p1_total"] == 2  # default 70
    assert plan_blocks(scenario(p1_threshold=80))["kpis"]["p1_total"] == 1
