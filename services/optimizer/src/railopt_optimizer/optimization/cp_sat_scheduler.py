import pandas as pd
from ortools.sat.python import cp_model


REQUIRED_COLUMNS = [
    "train_key",
    "station_id",
    "stop_order",
    "scheduled_departure",
    "predicted_delay_min",
]


def _to_minutes(value):
    if pd.isna(value):
        return 0

    if isinstance(value, (int, float)):
        return int(float(value))

    text = str(value).strip()
    if not text:
        return 0

    if text.count(":") == 2:
        hours, minutes, seconds = text.split(":")
        return int(hours) * 60 + int(minutes) + int(float(seconds) / 60)

    if text.count(":") == 1:
        hours, minutes = text.split(":")
        return int(hours) * 60 + int(minutes)

    try:
        return int(float(text))
    except ValueError:
        return 0


def prepare_prediction_table(predictions_df):
    """Normalize predicted delay output into a CP-SAT-friendly table."""
    df = predictions_df.copy()

    if df.empty:
        return pd.DataFrame(columns=REQUIRED_COLUMNS + ["scheduled_departure_minutes", "adjusted_departure_minutes"])

    if "train_key" not in df.columns:
        if "run_id" in df.columns:
            df["train_key"] = df["run_id"].astype(str)
        elif "service_id" in df.columns:
            df["train_key"] = df["service_id"].astype(str)
        else:
            df["train_key"] = [f"train_{idx}" for idx in range(len(df))]

    if "station_id" not in df.columns:
        if "station_id" in df.columns:
            pass
        else:
            raise ValueError("The prediction table must include a station_id column to be scheduled by CP-SAT.")

    if "stop_order" not in df.columns:
        if "segment_order" in df.columns:
            df["stop_order"] = df["segment_order"]
        else:
            df["stop_order"] = 1

    if "scheduled_departure" not in df.columns:
        if "scheduled_arrival" in df.columns:
            df["scheduled_departure"] = df["scheduled_arrival"]
        elif "scheduled_time" in df.columns:
            df["scheduled_departure"] = df["scheduled_time"]
        else:
            df["scheduled_departure"] = "00:00:00"

    if "predicted_delay_min" not in df.columns:
        for candidate in ["predicted_delay", "delay_minutes", "delay_min", "delta_delay"]:
            if candidate in df.columns:
                df["predicted_delay_min"] = df[candidate]
                break
        else:
            df["predicted_delay_min"] = 0.0

    df["train_key"] = df["train_key"].astype(str)
    df["station_id"] = df["station_id"].astype(str)
    df["stop_order"] = pd.to_numeric(df["stop_order"], errors="coerce").fillna(0).astype(int)
    df["predicted_delay_min"] = pd.to_numeric(df["predicted_delay_min"], errors="coerce").fillna(0.0)
    df["scheduled_departure_minutes"] = df["scheduled_departure"].map(_to_minutes)
    df["adjusted_departure_minutes"] = df["scheduled_departure_minutes"] + df["predicted_delay_min"]

    output_columns = [
        "train_key",
        "station_id",
        "stop_order",
        "scheduled_departure",
        "predicted_delay_min",
        "scheduled_departure_minutes",
        "adjusted_departure_minutes",
    ]
    result = df[output_columns].copy()
    result = result.sort_values(["train_key", "stop_order"]).reset_index(drop=True)
    return result


def build_train_schedule(prediction_table, min_headway_min=5, max_shift_min=180):
    """Create a CP-SAT schedule where trains are sequenced with a minimum headway per station."""
    prepared = prepare_prediction_table(prediction_table)

    if prepared.empty:
        return prepared

    model = cp_model.CpModel()
    departure_vars = {}
    station_order = {}

    for station_id, station_df in prepared.groupby("station_id"):
        ordered = station_df.sort_values(["scheduled_departure_minutes", "train_key"]).reset_index(drop=True)
        station_order[station_id] = ordered

        for row in ordered.itertuples(index=False):
            key = (str(row.train_key), str(row.station_id), int(row.stop_order))
            departure_var = model.NewIntVar(
                0,
                24 * 60 + max_shift_min,
                f"depart_{row.train_key}_{row.station_id}_{row.stop_order}",
            )
            departure_vars[key] = departure_var

            base_departure = int(row.scheduled_departure_minutes) + int(max(0, round(float(row.predicted_delay_min))))
            model.Add(departure_var >= base_departure)
            model.Add(departure_var <= base_departure + max_shift_min)

        for index in range(len(ordered) - 1):
            first = ordered.iloc[index]
            second = ordered.iloc[index + 1]

            first_key = (str(first.train_key), str(first.station_id), int(first.stop_order))
            second_key = (str(second.train_key), str(second.station_id), int(second.stop_order))

            dep_first = departure_vars[first_key]
            dep_second = departure_vars[second_key]
            model.Add(dep_second >= dep_first + min_headway_min)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30
    solver.parameters.num_search_workers = 4

    status = solver.Solve(model)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"CP-SAT scheduling failed with status: {status}")

    schedule_rows = []
    for row in prepared.itertuples(index=False):
        key = (str(row.train_key), str(row.station_id), int(row.stop_order))
        actual_departure = solver.Value(departure_vars[key])

        schedule_rows.append(
            {
                "train_key": row.train_key,
                "station_id": row.station_id,
                "stop_order": row.stop_order,
                "scheduled_departure": row.scheduled_departure,
                "predicted_delay_min": row.predicted_delay_min,
                "scheduled_departure_minutes": row.scheduled_departure_minutes,
                "adjusted_departure_minutes": row.adjusted_departure_minutes,
                "cp_sat_departure_minutes": actual_departure,
            }
        )

    schedule_df = pd.DataFrame(schedule_rows)
    schedule_df = schedule_df.sort_values(["station_id", "cp_sat_departure_minutes", "train_key"]).reset_index(drop=True)
    schedule_df.attrs["solver_status"] = solver.StatusName(status)
    schedule_df.attrs["wall_time_seconds"] = solver.WallTime()
    return schedule_df


if __name__ == "__main__":
    sample_df = pd.DataFrame(
        {
            "train_key": ["T1", "T1", "T2", "T2"],
            "station_id": ["A", "B", "A", "B"],
            "stop_order": [1, 2, 1, 2],
            "scheduled_departure": ["08:00:00", "08:20:00", "08:05:00", "08:25:00"],
            "predicted_delay_min": [5.0, -1.0, 2.0, 4.0],
        }
    )

    print(build_train_schedule(sample_df).to_string(index=False))