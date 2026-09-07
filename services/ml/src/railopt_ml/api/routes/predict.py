from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict

from railopt_ml.ml.model_service import FEATURE_COLUMNS, predict_delay

router = APIRouter()


class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prev_delay_departure_min: float
    is_prev_departure_delay_imputed: int
    station_id: str
    stop_order: int
    segment_id: str
    category_code: str
    distance_from_start_km: float
    min_technical_time_min: float
    time_reserve_min: float
    occupancy_level: float
    arrival_hour_sin: float
    arrival_hour_cos: float
    departure_hour_sin: float
    departure_hour_cos: float
    edge_active_difficulty_p90: float
    is_track_closure: int
    track_closure_length: float
    is_speed_warning: int
    speed_warning_length: float
    station_scheduled_dwell_time_P50: float
    station_scheduled_dwell_time_MAD: float
    station_scheduled_dwell_time_P90: float
    station_delta_stop_min_P50: float
    station_delta_stop_min_MAD: float
    station_delta_stop_min_P90: float
    edge_delta_edge_min_P50: float
    edge_delta_edge_min_MAD: float
    edge_delta_edge_min_P90: float
    edge_delta_delay_P50: float
    edge_delta_delay_P90: float
    edge_delta_delay_MAD: float
    temperature_2m: float
    snow_depth: float
    is_heavy_precipitation: int
    passenger_volume_rank: float
    num_platforms: int
    num_platform_tracks: int
    intersecting_lines_count: int
    is_node: int
    is_passing_loop: int
    node_historical_hazard_intensity: float
    edge_historical_hazard_intensity: float


class PredictionResponse(BaseModel):
    predicted_delay: float


@router.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    try:
        input_data = request.model_dump()
        ordered_input = {column: input_data[column] for column in FEATURE_COLUMNS}
        return PredictionResponse(predicted_delay=predict_delay(ordered_input))
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(
            status_code=500, detail="Delay prediction failed"
        ) from error