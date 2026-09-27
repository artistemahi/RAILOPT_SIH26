from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from railopt_optimizer.block_planning.service import plan_blocks
from railopt_optimizer.block_planning.what_if import run_what_if

router = APIRouter(tags=["block-planning"])


class PlanTask(BaseModel):
    task_id: str
    section_id: str
    department: str | None = None
    priority_score: float = 0
    asset_id: str | None = None
    task_type: str | None = None
    due_date: str | None = None


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
    department: str | None = None
    skills: str | None = None
    availability_start: str | None = None
    availability_end: str | None = None


class PlanTaskResource(BaseModel):
    task_id: str
    resource_id: str
    quantity: int | None = None
    mandatory: bool | None = None
    required_skill: str | None = None


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


class PlanSection(BaseModel):
    section_id: str
    electrified: bool | None = None
    operational_status: str | None = None


class PlanBlock(BaseModel):
    block_id: str
    max_duration_min: int | None = None


class PlanBlocksRequest(BaseModel):
    horizon_start: str = Field(description="Planning date, YYYY-MM-DD")
    horizon_days: int = Field(default=7, ge=1, le=31)
    time_limit_seconds: float = Field(default=20, gt=0, le=120)
    compare_modes: bool = False
    include_details: bool = False
    tasks: list[PlanTask] = Field(min_length=1)
    windows: list[PlanWindow] = Field(min_length=1)
    requirements: list[PlanRequirement]
    resources: list[PlanResource] = Field(default_factory=list)
    task_resources: list[PlanTaskResource] = Field(default_factory=list)
    dependencies: list[PlanDependency] = Field(default_factory=list)
    trains: list[PlanTrain] = Field(default_factory=list)
    sections: list[PlanSection] = Field(default_factory=list)
    blocks: list[PlanBlock] = Field(default_factory=list)


@router.post("/plan-blocks")
def plan_blocks_route(request: PlanBlocksRequest) -> dict[str, Any]:
    try:
        return plan_blocks(request.model_dump())
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail=f"Invalid planning input: {error}") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Block planning failed") from error


class WhatIfChange(BaseModel):
    type: str
    window_id: str | None = None
    resource_id: str | None = None
    task_id: str | None = None
    section_id: str | None = None
    minutes: int | None = None
    priority_score: float | None = None
    start_time: str | None = None
    end_time: str | None = None


class WhatIfRequest(BaseModel):
    planning: PlanBlocksRequest
    changes: list[WhatIfChange] = Field(default_factory=list, max_length=20)


@router.post("/what-if")
def what_if_route(request: WhatIfRequest) -> dict[str, Any]:
    changes = [change.model_dump(exclude_none=True) for change in request.changes]
    try:
        return run_what_if(request.planning.model_dump(), changes)
    except (ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail=f"Invalid scenario: {error}") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="What-if simulation failed") from error
