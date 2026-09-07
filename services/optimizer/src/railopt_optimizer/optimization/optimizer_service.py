from collections.abc import Sequence
from typing import Any

import pandas as pd

from railopt_optimizer.optimization.cp_sat_scheduler import build_train_schedule


def optimize_schedule(
    train_rows: Sequence[dict[str, Any]],
    min_headway_min: int = 5,
    max_shift_min: int = 180,
) -> tuple[str, float, list[dict[str, Any]]]:
    """Run the existing CP-SAT train sequencing scheduler."""
    if not train_rows:
        raise ValueError("At least one train row is required")
    if min_headway_min < 0 or max_shift_min < 0:
        raise ValueError("Headway and maximum shift must be non-negative")

    prediction_table = pd.DataFrame(train_rows)
    optimized = build_train_schedule(
        prediction_table,
        min_headway_min=min_headway_min,
        max_shift_min=max_shift_min,
    )

    schedule = []
    for row in optimized.to_dict(orient="records"):
        schedule.append(
            {
                "train_key": str(row["train_key"]),
                "station_id": str(row["station_id"]),
                "stop_order": int(row["stop_order"]),
                "scheduled_departure": str(row["scheduled_departure"]),
                "predicted_delay_min": float(row["predicted_delay_min"]),
                "cp_sat_departure_minutes": int(row["cp_sat_departure_minutes"]),
            }
        )

    return (
        str(optimized.attrs.get("solver_status", "UNKNOWN")),
        float(optimized.attrs.get("wall_time_seconds", 0.0)),
        schedule,
    )