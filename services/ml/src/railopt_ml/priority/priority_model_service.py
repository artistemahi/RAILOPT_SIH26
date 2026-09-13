from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[3]
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "xgboost_priority_model.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "priority_preprocessor.pkl"


class PriorityModelService:
    """
    Loads Manas's trained priority model + preprocessor
    and generates predicted/final priority scores.
    """

    def __init__(
        self,
        model_path: Path = MODEL_PATH,
        preprocessor_path: Path = PREPROCESSOR_PATH,
    ) -> None:

        self.model_path = Path(model_path)
        self.preprocessor_path = Path(preprocessor_path)

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Priority model not found: {self.model_path}"
            )

        if not self.preprocessor_path.exists():
            raise FileNotFoundError(
                f"Priority preprocessor not found: "
                f"{self.preprocessor_path}"
            )

        self.model = joblib.load(self.model_path)
        self.preprocessor = joblib.load(self.preprocessor_path)

    def predict(
        self,
        features_df: pd.DataFrame,
    ) -> pd.DataFrame:
        """
        Generate:
            predicted_priority_score
            final_priority_score

        final score:
            0.6 * calculated_priority_score
            + 0.4 * predicted_priority_score
        """

        if features_df.empty:
            raise ValueError(
                "Cannot predict priority for an empty dataframe."
            )

        df = features_df.copy()

        if "calculated_priority_score" not in df.columns:
            raise ValueError(
                "Missing required column: "
                "calculated_priority_score"
            )

        # -----------------------------------------------------
        # Columns used during Manas's model training
        # -----------------------------------------------------
        drop_columns = [
            "department_asset",
            "section_id_asset",
            "location_code_asset",
            "criticality_asset",
            "status_asset",
            "original_priority_score",
            "calculated_priority_score",
            "task_id",
            "asset_id",
        ]

        # Only drop columns that actually exist.
        X = df.drop(
            columns=[
                column
                for column in drop_columns
                if column in df.columns
            ],
            errors="ignore",
        )

        # -----------------------------------------------------
        # Apply the exact saved preprocessing pipeline
        # -----------------------------------------------------
        X_processed = self.preprocessor.transform(X)

        # -----------------------------------------------------
        # XGBoost prediction
        # -----------------------------------------------------
        predictions = self.model.predict(X_processed)

        df["predicted_priority_score"] = (
            pd.to_numeric(
                predictions,
                errors="coerce",
            )
            .clip(0, 100)
        )

        # -----------------------------------------------------
        # Final planning score
        # -----------------------------------------------------
        df["final_priority_score"] = (
            0.6 * df["calculated_priority_score"]
            + 0.4 * df["predicted_priority_score"]
        ).clip(0, 100)

        return df

    def predict_one(
        self,
        features: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Convenience method for a single maintenance task.
        """

        features_df = pd.DataFrame([features])

        result = self.predict(features_df)

        row = result.iloc[0]

        return {
            "task_id": row.get("task_id"),
            "asset_id": row.get("asset_id"),
            "calculated_priority_score": float(
                row["calculated_priority_score"]
            ),
            "predicted_priority_score": float(
                row["predicted_priority_score"]
            ),
            "final_priority_score": float(
                row["final_priority_score"]
            ),
        }