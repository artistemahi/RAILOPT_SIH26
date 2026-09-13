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


@router.post("/predict")
def predict_priority(
    request: PriorityPredictionRequest,
) -> dict[str, Any]:

    try:
        if not request.tasks:
            raise HTTPException(
                status_code=400,
                detail="At least one maintenance task is required.",
            )

        tasks_df = pd.DataFrame(request.tasks)
        assets_df = pd.DataFrame(request.assets)
        defects_df = pd.DataFrame(request.defects)
        trains_df = pd.DataFrame(request.trains)

        features_df = build_priority_features(
            tasks=tasks_df,
            assets=assets_df,
            defects=defects_df,
            trains=trains_df,
        )

        result_df = model_service.predict(features_df)

        results = []

        for _, row in result_df.iterrows():
            results.append(
                {
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
            )

        return {
            "success": True,
            "count": len(results),
            "results": results,
        }

    except HTTPException:
        raise

    except Exception as exc:
        print("Priority prediction failed:", exc)

        raise HTTPException(
            status_code=500,
            detail="Priority prediction failed.",
        ) from exc