import copy

import pytest

from railopt_optimizer.block_planning.what_if import apply_changes, run_what_if
from test_block_planning import BASE


def scenario(**changes):
    data = copy.deepcopy(BASE)
    data.update(changes)
    return data


def test_no_changes_means_no_difference():
    result = run_what_if(scenario(), [])
    assert result["diff"] == {"added": [], "removed": [], "moved": [], "unchanged": 2}
    assert result["baseline"]["kpis"] == result["scenario"]["kpis"]


def test_closing_the_only_window_removes_tasks_with_reason():
    result = run_what_if(scenario(), [{"type": "WINDOW_UNAVAILABLE", "window_id": "W1"}])
    removed = {row["task_id"]: row for row in result["diff"]["removed"]}
    assert set(removed) == {"T1", "T2"}
    assert removed["T1"]["reason_code"] == "WINDOW_UNAVAILABLE"
    assert result["scenario"]["validation"]["passed"]


def test_extra_train_moves_work_after_it():
    result = run_what_if(
        scenario(),
        [{"type": "TRAIN_ADD", "section_id": "SEC_A",
          "start_time": "2026-09-14 02:00:00", "end_time": "2026-09-14 02:30:00"}],
    )
    moved = {row["task_id"]: row for row in result["diff"]["moved"]}
    assert set(moved) == {"T1", "T2"}
    assert all(row["to"]["start"] == "2026-09-14 02:30" for row in moved.values())


def test_longer_task_no_longer_fits():
    result = run_what_if(scenario(), [{"type": "TASK_DURATION", "task_id": "T2", "minutes": 120}])
    removed = {row["task_id"]: row for row in result["diff"]["removed"]}
    assert removed["T2"]["reason_code"] == "WINDOW_TOO_SHORT"
    assert result["diff"]["unchanged"] == 1


def test_task_remove_and_priority_change():
    data = scenario()
    data["tasks"][0]["asset_id"] = data["tasks"][1]["asset_id"] = "A1"  # must run one after the other
    result = run_what_if(data, [{"type": "TASK_PRIORITY", "task_id": "T2", "priority_score": 99}])
    moved = {row["task_id"] for row in result["diff"]["moved"]}
    assert moved == {"T1", "T2"}  # T2 now goes first
    removed = run_what_if(data, [{"type": "TASK_REMOVE", "task_id": "T1"}])["diff"]["removed"]
    assert [row["reason_code"] for row in removed] == ["REMOVED"]


@pytest.mark.parametrize(
    "change",
    [
        {"type": "WINDOW_UNAVAILABLE", "window_id": "NOPE"},
        {"type": "TASK_DURATION", "task_id": "T1", "minutes": 0},
        {"type": "WINDOW_SHORTEN", "window_id": "W1", "minutes": 500},
        {"type": "TASK_PRIORITY", "task_id": "T1", "priority_score": 150},
        {"type": "SOMETHING_ELSE"},
    ],
)
def test_invalid_changes_are_rejected(change):
    with pytest.raises(ValueError):
        apply_changes(scenario(), [change])
