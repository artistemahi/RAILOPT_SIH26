from collections.abc import Mapping
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


SERVICE_DIR = Path(__file__).resolve().parents[3]
MODEL_DIR = SERVICE_DIR / "models"
MODEL_PATH = MODEL_DIR / "xgboost_delay_model.pkl"
PREPROCESSOR_PATH = MODEL_DIR / "delay_preprocessor.pkl"

FEATURE_COLUMNS = [
    "prev_delay_departure_min",
    "is_prev_departure_delay_imputed",
    "station_id",
    "stop_order",
    "segment_id",
    "category_code",
    "distance_from_start_km",
    "min_technical_time_min",
    "time_reserve_min",
    "occupancy_level",
    "arrival_hour_sin",
    "arrival_hour_cos",
    "departure_hour_sin",
    "departure_hour_cos",
    "edge_active_difficulty_p90",
    "is_track_closure",
    "track_closure_length",
    "is_speed_warning",
    "speed_warning_length",
    "station_scheduled_dwell_time_P50",
    "station_scheduled_dwell_time_MAD",
    "station_scheduled_dwell_time_P90",
    "station_delta_stop_min_P50",
    "station_delta_stop_min_MAD",
    "station_delta_stop_min_P90",
    "edge_delta_edge_min_P50",
    "edge_delta_edge_min_MAD",
    "edge_delta_edge_min_P90",
    "edge_delta_delay_P50",
    "edge_delta_delay_P90",
    "edge_delta_delay_MAD",
    "temperature_2m",
    "snow_depth",
    "is_heavy_precipitation",
    "passenger_volume_rank",
    "num_platforms",
    "num_platform_tracks",
    "intersecting_lines_count",
    "is_node",
    "is_passing_loop",
    "node_historical_hazard_intensity",
    "edge_historical_hazard_intensity",
]


if not MODEL_PATH.is_file():
    raise FileNotFoundError(f"Delay model artifact not found: {MODEL_PATH}")
if not PREPROCESSOR_PATH.is_file():
    raise FileNotFoundError(
        f"Delay preprocessor artifact not found: {PREPROCESSOR_PATH}"
    )

model = joblib.load(MODEL_PATH)
preprocessor = joblib.load(PREPROCESSOR_PATH)

serialized_features = list(preprocessor.feature_names_in_)
if serialized_features != FEATURE_COLUMNS:
    raise RuntimeError(
        "Saved preprocessor feature columns do not match the ML request schema"
    )


def predict_delay(input_data: Mapping[str, Any]) -> float:
    provided_columns = set(input_data)
    required_columns = set(FEATURE_COLUMNS)
    missing_columns = required_columns - provided_columns
    extra_columns = provided_columns - required_columns

    if missing_columns:
        raise ValueError(
            f"Missing required features: {', '.join(sorted(missing_columns))}"
        )
    if extra_columns:
        raise ValueError(
            f"Unexpected features: {', '.join(sorted(extra_columns))}"
        )

    frame = pd.DataFrame([dict(input_data)], columns=FEATURE_COLUMNS)
    processed_data = preprocessor.transform(frame)
    prediction = model.predict(processed_data)[0]
    return float(prediction)