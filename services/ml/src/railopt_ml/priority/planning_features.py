"""Planning-time features for pending maintenance tasks.

Maps railopt.* task, asset and defect rows onto the features the v2 priority
model was trained on (see training.py):

    department, task_type, criticality, urgency, operational_impact
        taken from the task
    estimated_duration      task.estimated_duration_min
    was_overdue             task.is_overdue
    defect_severity         the task's source defect when it has one,
                            otherwise the most severe unresolved defect on
                            the asset, otherwise LOW
    repeat_defect           the source defect's flag, otherwise whether any
                            unresolved defect on the asset is a repeat
"""

from __future__ import annotations

import pandas as pd

from railopt_ml.priority.training import FEATURES

SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def _as_bool(value) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"true", "t", "1", "yes"}
    return bool(value) if pd.notna(value) else False


def _upper(value) -> str:
    return str(value).strip().upper() if pd.notna(value) else ""


def build_planning_features(tasks: pd.DataFrame, defects: pd.DataFrame) -> pd.DataFrame:
    defects = defects.copy() if not defects.empty else pd.DataFrame(
        columns=["defect_id", "asset_id", "severity", "status", "repeat_defect"]
    )
    defects["severity"] = defects["severity"].map(_upper)
    defects["repeat_defect"] = defects["repeat_defect"].map(_as_bool)
    by_id = defects.set_index("defect_id")
    unresolved = defects[defects["status"].map(_upper) != "RESOLVED"]

    worst_by_asset: dict[str, str] = {}
    repeat_by_asset: dict[str, bool] = {}
    for asset_id, group in unresolved.groupby("asset_id"):
        known = [s for s in group["severity"] if s in SEVERITY_ORDER]
        if known:
            worst_by_asset[asset_id] = max(known, key=SEVERITY_ORDER.index)
        repeat_by_asset[asset_id] = bool(group["repeat_defect"].any())

    rows = []
    for task in tasks.to_dict(orient="records"):
        source = task.get("source_defect_id")
        source_defect = by_id.loc[source] if source in by_id.index else None
        if source_defect is not None and source_defect["severity"] in SEVERITY_ORDER:
            severity = source_defect["severity"]
            repeat = bool(source_defect["repeat_defect"])
        else:
            severity = worst_by_asset.get(task.get("asset_id"), "LOW")
            repeat = repeat_by_asset.get(task.get("asset_id"), False)

        rows.append(
            {
                "department": _upper(task.get("department")),
                "task_type": _upper(task.get("task_type")),
                "defect_severity": severity,
                "criticality": pd.to_numeric(task.get("criticality"), errors="coerce"),
                "urgency": pd.to_numeric(task.get("urgency"), errors="coerce"),
                "operational_impact": pd.to_numeric(task.get("operational_impact"), errors="coerce"),
                "estimated_duration": pd.to_numeric(task.get("estimated_duration_min"), errors="coerce"),
                "was_overdue": int(_as_bool(task.get("is_overdue"))),
                "repeat_defect": int(repeat),
            }
        )

    features = pd.DataFrame(rows, columns=FEATURES)
    numeric = ["criticality", "urgency", "operational_impact", "estimated_duration"]
    features[numeric] = features[numeric].astype(float).fillna(0.0)
    return features
