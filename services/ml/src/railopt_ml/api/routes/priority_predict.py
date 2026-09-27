from __future__ import annotations

from typing import Any

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from railopt_ml.priority.priority_features import build_priority_features
from railopt_ml.priority.priority_model_service import PriorityModelService


router = APIRouter(
    prefix="/priority",
    tags=["Priority Prediction"],
)

model_service = PriorityModelService()


class PriorityPredictionRequest(BaseModel):
    tasks: list[dict[str, Any]] = Field(default_factory=list)
    assets: list[dict[str, Any]] = Field(default_factory=list)
    defects: list[dict[str, Any]] = Field(default_factory=list)
    trains: list[dict[str, Any]] = Field(default_factory=list)


@router.get("/model")
def model_info() -> dict[str, Any]:
    """Model version, features and training metrics."""
    return model_service.metadata


@router.post("/predict")
def predict_priority(
    request: PriorityPredictionRequest,
) -> dict[str, Any]:
    """
    Score tasks with the v2 priority model.

    final_priority_score is the model prediction. calculated_priority_score is
    the earlier rule-based score (criticality, urgency, impact with train
    pressure, overdue), returned for reference only.
    """
    if not request.tasks:
        raise HTTPException(
            status_code=400,
            detail="At least one maintenance task is required.",
        )

    try:
        tasks_df = pd.DataFrame(request.tasks)
        defects_df = pd.DataFrame(request.defects)

        predicted = model_service.predict(tasks_df, defects_df)
        calculated = build_priority_features(
            tasks=tasks_df,
            assets=pd.DataFrame(request.assets),
            defects=defects_df,
            trains=pd.DataFrame(request.trains),
        )["calculated_priority_score"]

        results = [
            {
                "task_id": task.get("task_id"),
                "asset_id": task.get("asset_id"),
                "calculated_priority_score": round(float(calculated.iloc[index]), 3),
                "predicted_priority_score": round(float(predicted.iloc[index]), 3),
                "final_priority_score": round(float(predicted.iloc[index]), 3),
            }
            for index, task in enumerate(request.tasks)
        ]

        return {
            "success": True,
            "count": len(results),
            "model_version": model_service.model_version,
            "results": results,
        }

    except Exception as exc:
        print("Priority prediction failed:", exc)

        raise HTTPException(
            status_code=500,
            detail="Priority prediction failed.",
        ) from exc
