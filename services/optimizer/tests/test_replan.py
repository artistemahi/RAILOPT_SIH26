"""Emergency replanning and planner pins on a small two-window scenario.

W1 02:00-05:00 and W2 10:00-14:00 on SEC_A; T1 (90) and T2 (70) can work
in parallel (different departments, no shared resource or asset).
"""

import copy

from test_block_planning import BASE

from railopt_optimizer.block_planning.replan import replan
from railopt_optimizer.block_planning.service import plan_blocks


def two_windows():
    data = copy.deepcopy(BASE)
    second = copy.deepcopy(data["windows"][0])
    second.update(window_id="W2", start_time="2026-09-14 10:00:00", end_time="2026-09-14 14:00:00")
    data["windows"].append(second)
    return data


def previous_plan(data):
    return plan_blocks(data)["assignments"]


def placed(result):
    return {item["task_id"]: item for item in result["assignments"]}


def test_nothing_changes_without_a_disruption():
    data = two_windows()
    previous = previous_plan(data)
    result = replan(data, previous, [], freeze_before="2026-09-14 00:30:00")
    assert result["validation"]["passed"]
    assert result["replan"]["diff"]["unchanged"] == len(previous)
    assert not result["replan"]["diff"]["moved"]


def test_work_started_before_the_disruption_is_frozen():
    data = two_windows()
    previous = previous_plan(data)
    assert {item["window_id"] for item in previous} == {"W1"}
    result = replan(data, previous, [], freeze_before="2026-09-14 02:30:00")
    assert {row["task_id"] for row in result["replan"]["frozen"]} == {"T1", "T2"}
    assert placed(result)["T1"]["start_minute"] == 120


def test_lost_window_moves_unstarted_work_to_the_next_window():
    data = two_windows()
    previous = previous_plan(data)
    result = replan(
        data, previous, [{"type": "WINDOW_UNAVAILABLE", "window_id": "W1"}],
        freeze_before="2026-09-14 01:00:00",
    )
    assert result["validation"]["passed"]
    assert {item["window_id"] for item in result["assignments"]} == {"W2"}
    assert {row["task_id"] for row in result["replan"]["diff"]["moved"]} == {"T1", "T2"}


def test_new_work_never_starts_before_the_disruption_time():
    data = two_windows()
    previous = [item for item in previous_plan(data) if item["task_id"] == "T1"]
    result = replan(data, previous, [], freeze_before="2026-09-14 03:00:00")
    assert placed(result)["T1"]["start_minute"] == 120  # frozen
    assert placed(result)["T2"]["start_minute"] >= 180
    assert [row["task_id"] for row in result["replan"]["diff"]["added"]] == ["T2"]


def test_frozen_work_is_kept_even_if_the_disruption_hits_its_window():
    data = two_windows()
    previous = previous_plan(data)
    result = replan(
        data, previous, [{"type": "WINDOW_UNAVAILABLE", "window_id": "W1"}],
        freeze_before="2026-09-14 03:00:00",
    )
    assert {row["task_id"] for row in result["replan"]["frozen"]} == {"T1", "T2"}
    assert result["replan"]["frozen_conflicts"] == []
    assert result["validation"]["passed"]


def test_in_progress_work_still_holds_its_resource():
    data = two_windows()
    data["task_resources"] = [
        {"task_id": "T1", "resource_id": "R1", "quantity": 1, "mandatory": True},
        {"task_id": "T2", "resource_id": "R1", "quantity": 1, "mandatory": True},
    ]
    previous = [item for item in previous_plan(data) if item["task_id"] == "T1"]
    t1_end = previous[0]["end_minute"]
    result = replan(data, previous, [], freeze_before="2026-09-14 02:30:00")
    assert result["validation"]["passed"]
    assert placed(result)["T2"]["start_minute"] >= t1_end


def test_planner_pin_forces_a_window():
    data = two_windows()
    previous = previous_plan(data)
    result = replan(data, previous, [], pins={"T2": "W2"})
    assert placed(result)["T2"]["window_id"] == "W2"
    assert placed(result)["T1"]["window_id"] == "W1"
    assert result["validation"]["passed"]
    assert result["replan"]["unmet_pins"] == []
