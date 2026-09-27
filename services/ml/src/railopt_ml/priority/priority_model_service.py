from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


BASE_DIR = Path(__file__).resolve().parents[3]
MODEL_DIR = BASE_DIR / "models"

MODEL_PATH = MODEL_DIR / "xgboost_priority_model.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "priority_preprocessor.pkl"

# Dataset values whose training-vocabulary equivalent differs by more than
# case/formatting. Keep this list to unambiguous equivalences only.
CATEGORY_SYNONYMS: dict[str, dict[str, str]] = {
    # TRD (traction distribution) is the electrical department.
    "department": {"trd": "Electrical"},
    "maintenance_type": {
        "preventivemaintenance": "Preventive",
        "correctivemaintenance": "Corrective",
    },
    "can_be_rescheduled": {"true": "Yes", "false": "No"},
}


def _normalize_category(value: Any) -> str:
    """Case- and separator-insensitive key: 'IN_PROGRESS' -> 'inprogress'."""
    return re.sub(r"[\s_\-]+", "", str(value)).lower()


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
        self.category_vocabulary = self._read_category_vocabulary()
        self.last_unmapped: dict[str, list[str]] = {}

    def _read_category_vocabulary(self) -> dict[str, list[str]]:
        """Categories the fitted one-hot encoder knows, per input column."""
        vocabulary: dict[str, list[str]] = {}
        for _, transformer, columns in self.preprocessor.transformers_:
            steps = getattr(transformer, "named_steps", {})
            encoder = steps.get("encoder") if steps else None
            if encoder is None or not hasattr(encoder, "categories_"):
                continue
            for column, categories in zip(columns, encoder.categories_):
                vocabulary[column] = [str(category) for category in categories]
        return vocabulary

    def align_categories(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Map dataset category spellings onto the training vocabulary.

        The encoder ignores unknown categories (they encode to all zeros), so
        'ENGINEERING' would be silently dropped when training saw
        'Engineering'. Values with no unambiguous match are left unchanged and
        reported in last_unmapped.
        """
        X = X.copy()
        unmapped: dict[str, list[str]] = {}

        for column, categories in self.category_vocabulary.items():
            if column not in X.columns:
                continue

            lookup = {_normalize_category(category): category for category in categories}
            lookup.update(CATEGORY_SYNONYMS.get(column, {}))

            def align(value: Any) -> Any:
                if pd.isna(value):
                    return value
                return lookup.get(_normalize_category(value), value)

            X[column] = X[column].map(align)

            known = set(categories)
            missing = sorted(
                {str(value) for value in X[column].dropna() if str(value) not in known}
            )
            if missing:
                unmapped[column] = missing

        self.last_unmapped = unmapped
        return X

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
        X = self.align_categories(X)
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