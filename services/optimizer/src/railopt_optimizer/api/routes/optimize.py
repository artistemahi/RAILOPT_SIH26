from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from railopt_optimizer.optimization.optimizer_service import optimize_schedule

router = APIRouter(tags=["optimization"])


class ScheduleRowRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    train_key: str = Field(min_length=1)
    station_id: str = Field(min_length=1)
    stop_order: int = Field(ge=1)
    scheduled_departure: str = Field(min_length=1)
    predicted_delay_min: float


class OptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    trains: list[ScheduleRowRequest] = Field(min_length=1)
    min_headway_min: int = Field(default=5, ge=0)
    max_shift_min: int = Field(default=180, ge=0)


class ScheduleRowResponse(BaseModel):
    train_key: str
    station_id: str
    stop_order: int
    scheduled_departure: str
    predicted_delay_min: float
    cp_sat_departure_minutes: int


class OptimizeResponse(BaseModel):
    solver_status: str
    schedule: list[ScheduleRowResponse]
    metadata: dict[str, float | int]


@router.post("/optimize", response_model=OptimizeResponse)
def optimize(request: OptimizeRequest) -> OptimizeResponse:
    try:
        solver_status, wall_time_seconds, schedule = optimize_schedule(
            [row.model_dump() for row in request.trains],
            min_headway_min=request.min_headway_min,
            max_shift_min=request.max_shift_min,
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail="Schedule optimization failed") from error
    except Exception as error:
        raise HTTPException(status_code=500, detail="Schedule optimization failed") from error

    return OptimizeResponse(
        solver_status=solver_status,
        schedule=schedule,
        metadata={
            "rows": len(schedule),
            "min_headway_min": request.min_headway_min,
            "max_shift_min": request.max_shift_min,
            "wall_time_seconds": wall_time_seconds,
        },
    )