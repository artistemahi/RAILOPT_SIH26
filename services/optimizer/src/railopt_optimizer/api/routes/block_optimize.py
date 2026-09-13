from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from railopt_optimizer.optimization.block_planner_service import optimize_block_plan

router = APIRouter(tags=["block-planning"])


class BlockOptimizeRequest(BaseModel):
    tables: dict[str, list[dict[str, Any]]]
    time_limit_seconds: float = Field(default=60.0, gt=0, le=600)
    workers: int = Field(default=8, gt=0, le=64)


@router.post("/optimize-blocks")
def optimize_blocks(request: BlockOptimizeRequest) -> dict[str, Any]:
    try:
        return optimize_block_plan(
            request.tables,
            time_limit_seconds=request.time_limit_seconds,
            workers=request.workers,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Block planning optimization failed") from error
