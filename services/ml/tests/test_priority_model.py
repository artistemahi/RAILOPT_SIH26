import pandas as pd

from railopt_ml.priority.planning_features import build_planning_features
from railopt_ml.priority.priority_model_service import PriorityModelService
from railopt_ml.priority.training import FEATURES

DEFECTS = pd.DataFrame(
    [
        {"defect_id": "D1", "asset_id": "A1", "severity": "CRITICAL", "status": "OPEN", "repeat_defect": True},
        {"defect_id": "D2", "asset_id": "A1", "severity": "LOW", "status": "OPEN", "repeat_defect": False},
        {"defect_id": "D3", "asset_id": "A2", "severity": "HIGH", "status": "RESOLVED", "repeat_defect": True},
    ]
)


def task(**overrides):
    base = {
        "task_id": "T1", "asset_id": "A1", "department": "ENGINEERING", "task_type": "INSPECTION",
        "criticality": 60, "urgency": 50, "operational_impact": 40, "estimated_duration_min": 90,
        "is_overdue": False, "source_defect_id": None,
    }
    base.update(overrides)
    return base


def test_features_match_training_columns():
    features = build_planning_features(pd.DataFrame([task()]), DEFECTS)
    assert list(features.columns) == FEATURES


def test_source_defect_wins_over_asset_worst_defect():
    features = build_planning_features(pd.DataFrame([task(source_defect_id="D2")]), DEFECTS)
    assert features.loc[0, "defect_severity"] == "LOW"
    assert features.loc[0, "repeat_defect"] == 0


def test_asset_worst_unresolved_defect_is_used_without_source():
    features = build_planning_features(pd.DataFrame([task(), task(task_id="T2", asset_id="A2")]), DEFECTS)
    assert features.loc[0, "defect_severity"] == "CRITICAL"
    assert features.loc[0, "repeat_defect"] == 1
    # A2's only defect is resolved.
    assert features.loc[1, "defect_severity"] == "LOW"


def test_model_ranks_more_urgent_critical_work_higher():
    service = PriorityModelService()
    tasks = pd.DataFrame([
        task(task_id="LOW", criticality=45, urgency=5, operational_impact=15, source_defect_id="D2"),
        task(task_id="HIGH", criticality=92, urgency=95, operational_impact=75, source_defect_id="D1"),
    ])
    scores = service.predict(tasks, DEFECTS)
    assert scores.iloc[1] > scores.iloc[0] + 20
    assert scores.between(0, 100).all()
