"""Train the RAILOPT priority model on the synthetic historical records.

Run from services/ml:

    .venv/bin/python -m railopt_ml.priority.training

Only features that are known at planning time for a pending task are used.
Columns that are only known after the work is done (actual_duration,
delay_to_completion) would leak the outcome, and weather_risk,
maintenance_frequency and previous_failure_indicator have no source for
pending tasks in the dataset, so they are excluded.

Note: in the synthetic dataset final_priority is a deterministic function of
the record's fields. The model therefore learns that priority policy; its
accuracy says how well it reproduces the policy from planning-time inputs,
not how well it predicts real-world failures.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
import sklearn
import xgboost
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

SERVICE_DIR = Path(__file__).resolve().parents[3]
REPO_DIR = SERVICE_DIR.parents[1]
DATA_PATH = REPO_DIR / "data" / "railopt_raw" / "07_ml" / "historical_records.csv"
MODEL_DIR = SERVICE_DIR / "models"

MODEL_VERSION = "railopt-xgb-priority-v2"
MODEL_PATH = MODEL_DIR / "priority_model_v2.joblib"
METADATA_PATH = MODEL_DIR / "priority_model_v2.json"

CATEGORICAL_FEATURES = ["department", "task_type", "defect_severity"]
NUMERIC_FEATURES = [
    "criticality",
    "urgency",
    "operational_impact",
    "estimated_duration",
    "was_overdue",
    "repeat_defect",
]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "final_priority"
SEED = 42


def build_pipeline(model) -> Pipeline:
    preprocessor = ColumnTransformer(
        [
            ("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
            ("numeric", "passthrough", NUMERIC_FEATURES),
        ]
    )
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def xgb_model() -> XGBRegressor:
    return XGBRegressor(
        n_estimators=400,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=SEED,
    )


def load_training_data() -> tuple[pd.DataFrame, pd.Series, str]:
    raw = DATA_PATH.read_bytes()
    frame = pd.read_csv(DATA_PATH)
    X = frame[FEATURES].copy()
    for column in ("was_overdue", "repeat_defect"):
        X[column] = X[column].astype(int)
    return X, frame[TARGET], hashlib.sha256(raw).hexdigest()


def train() -> dict:
    X, y, data_hash = load_training_data()

    cv = KFold(n_splits=5, shuffle=True, random_state=SEED)
    scoring = ["neg_mean_absolute_error", "r2"]

    def cv_scores(model) -> dict:
        scores = cross_validate(build_pipeline(model), X, y, cv=cv, scoring=scoring)
        return {
            "mae": round(float(-scores["test_neg_mean_absolute_error"].mean()), 3),
            "r2": round(float(scores["test_r2"].mean()), 4),
        }

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=SEED)
    holdout_model = build_pipeline(xgb_model()).fit(X_train, y_train)
    predictions = holdout_model.predict(X_test)

    final_model = build_pipeline(xgb_model()).fit(X, y)
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(final_model, MODEL_PATH)

    metadata = {
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "training_data": str(DATA_PATH.relative_to(REPO_DIR)),
        "training_data_sha256": data_hash,
        "rows": int(len(X)),
        "target": TARGET,
        "features": FEATURES,
        "excluded_features": {
            "actual_duration": "known only after the work (leakage)",
            "delay_to_completion": "known only after the work (leakage)",
            "weather_risk": "no source for pending tasks",
            "maintenance_frequency": "no source for pending tasks",
            "previous_failure_indicator": "no source for pending tasks",
        },
        "label_note": "Synthetic label: final_priority is a deterministic function of record fields.",
        "metrics": {
            "cv5_xgboost": cv_scores(xgb_model()),
            "cv5_linear_regression": cv_scores(LinearRegression()),
            "holdout_20pct_xgboost": {
                "mae": round(float(mean_absolute_error(y_test, predictions)), 3),
                "r2": round(float(r2_score(y_test, predictions)), 4),
            },
        },
        "versions": {"xgboost": xgboost.__version__, "scikit-learn": sklearn.__version__},
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2) + "\n")
    return metadata


if __name__ == "__main__":
    print(json.dumps(train()["metrics"], indent=2))
