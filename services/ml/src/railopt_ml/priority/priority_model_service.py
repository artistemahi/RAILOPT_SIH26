from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from railopt_ml.priority.planning_features import build_planning_features
from railopt_ml.priority.training import METADATA_PATH, MODEL_PATH, MODEL_VERSION


class PriorityModelService:
    """
    Loads the v2 priority model (trained by railopt_ml.priority.training on
    data/railopt_raw/07_ml/historical_records.csv) and scores pending tasks.
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        metadata_path: Path = METADATA_PATH,
    ) -> None:
        if not Path(model_path).exists():
            raise FileNotFoundError(
                f"Priority model not found: {model_path}. "
                "Train it with: python -m railopt_ml.priority.training"
            )
        self.model = joblib.load(model_path)
        self.metadata = (
            json.loads(Path(metadata_path).read_text()) if Path(metadata_path).exists() else {}
        )
        self.model_version = self.metadata.get("model_version", MODEL_VERSION)

    def predict(self, tasks: pd.DataFrame, defects: pd.DataFrame) -> pd.Series:
        """Predicted priority score (0-100) per task, in task order."""
        if tasks.empty:
            raise ValueError("Cannot predict priority for an empty task list.")
        features = build_planning_features(tasks, defects)
        predictions = pd.Series(self.model.predict(features), index=tasks.index)
        return predictions.clip(0, 100)
