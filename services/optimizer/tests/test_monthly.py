"""Monthly rough-cut plan on the small scenario.

W1 02:00-05:00 on SEC_A (180 train-free min per week); tasks need 75 min.
"""

import copy

from test_block_planning import BASE

from railopt_optimizer.block_planning.monthly import plan_month


def tasks(count, due="2026-09-30"):
    data = copy.deepcopy(BASE)
    data["tasks"] = [
        {"task_id": f"T{i}", "section_id": "SEC_A", "department": "S&T",
         "priority_score": 90 - i, "due_date": due}
        for i in range(1, count + 1)
    ]
    template = data["requirements"][0]
    data["requirements"] = [{**template, "task_id": f"T{i}"} for i in range(1, count + 1)]
    return data


def weeks_of(result):
    return {row["task_id"]: row["week"] for row in result["assignments"]}


def test_weekly_capacity_spreads_work_over_weeks():
    result = plan_month(tasks(5), weeks=3)
    assert result["solver"]["status"] == "OPTIMAL"
    assert result["validation"]["passed"]
    placed = weeks_of(result)
    # 180 train-free minutes per week hold two 75-minute tasks.
    assert [list(placed.values()).count(w) for w in range(3)] == [2, 2, 1]
    # Higher priority goes to earlier weeks.
    assert placed["T1"] == 0 and placed["T5"] == 2
    assert result["week_summary"][1]["projected"] is True


def test_overflow_is_reported_as_capacity():
    result = plan_month(tasks(5), weeks=2)
    assert len(result["assignments"]) == 4
    assert result["unplanned"][0]["task_id"] == "T5"
    assert result["unplanned"][0]["reason_code"] == "CAPACITY"


def test_due_date_beats_plain_priority_order():
    data = tasks(3)
    data["tasks"][2]["due_date"] = "2026-09-15"  # lowest priority but due in week 0
    data["tasks"][0]["due_date"] = "2026-10-30"
    placed = weeks_of(plan_month(data, weeks=2))
    # T3 (lowest priority, due now) takes a week-0 slot ahead of T2, which
    # is not due until week 2; T1 is highest priority and not late either.
    assert placed["T3"] == 0
    assert placed["T1"] == 0
    assert placed["T2"] == 1


def test_predecessor_week_before_successor_and_blocked_reason():
    data = tasks(3)
    data["dependencies"] = [
        {"predecessor_task_id": "T3", "successor_task_id": "T1", "minimum_gap_min": 0, "mandatory": True}
    ]
    placed = weeks_of(plan_month(data, weeks=2))
    assert placed["T3"] <= placed["T1"]

    data["requirements"] = [r for r in data["requirements"] if r["task_id"] != "T3"]
    result = plan_month(data, weeks=2)
    reasons = {row["task_id"]: row["reason_code"] for row in result["unplanned"]}
    assert reasons["T1"] == "DEPENDENCY_BLOCKED"


def test_too_long_work_becomes_a_block_request():
    data = tasks(1)
    data["requirements"][0]["minimum_block_duration_min"] = 300
    result = plan_month(data, weeks=2)
    assert result["unplanned"][0]["reason_code"] == "WINDOW_TOO_SHORT"
    request = result["block_requests"][0]
    assert request["section_id"] == "SEC_A"
    assert request["longest_train_free_gap_minutes"] == 180
