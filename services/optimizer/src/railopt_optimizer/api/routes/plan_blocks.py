from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from railopt_optimizer.block_planning.service import plan_blocks

router = APIRouter(tags=["block-planning"])


class PlanTask(BaseModel):
    task_id: str
    section_id: str
    department: str | None = None
    priority_score: float = 0


class PlanWindow(BaseModel):
    window_id: str
    block_id: str
    block_type: str
    section_id: str | None = None
    sections: list[str] = Field(default_factory=list)
    start_time: str
    end_time: str
    available: bool
    status: str | None = None


class PlanRequirement(BaseModel):
    task_id: str
    block_id: str
    required_block_type: str | None = None
    minimum_block_duration_min: int | None = None
    setup_duration_min: int | None = None
    release_duration_min: int | None = None


class PlanResource(BaseModel):
    resource_id: str
    capacity: int | None = None
    status: str | None = None
    availability_start: str | None = None
    availability_end: str | None = None


class PlanTaskResource(BaseModel):
    task_id: str
    resource_id: str
    quantity: int | None = None
    mandatory: bool | None = None


class PlanDependency(BaseModel):
    predecessor_task_id: str
    successor_task_id: str
    minimum_gap_min: int | None = None
    mandatory: bool | None = None


class PlanTrain(BaseModel):
    movement_id: str
    section_id: str
    entry_time: str
    exit_time: str


class PlanBlocksRequest(BaseModel):
    horizon_start: str = Field(description="Planning date, YYYY-MM-DD")
    horizon_days: int = Field(default=7, ge=1, le=31)
    time_limit_seconds: float = Field(default=20, gt=0, le=120)
    tasks: list[PlanTask] = Field(min_length=1)
    windows: list[PlanWindow] = Field(min_length=1)
    requirements: list[PlanRequirement]
    resources: list[PlanResource] = Field(default_factory=list)
    task_resources: list[PlanTaskResource] = Field(default_factory=list)
    dependencies: list[PlanDependency] = Field(default_factory=list)
    trains: list[PlanTrain] = Field(default_factory=list)


@router.post("/plan-blocks")
def plan_blocks_route(request: PlanBlocksRequest) -> dict[str, Any]:
    try:
        return plan_blocks(request.model_dump())
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail=f"Invalid planning input: {error}") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Block planning failed") from error
