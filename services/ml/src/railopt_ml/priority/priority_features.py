from __future__ import annotations

from datetime import date
import pandas as pd


def normalize(series: pd.Series) -> pd.Series:
    """
    Normalize a numeric series to 0-100.

    Same logic as prepare_data.py.
    """
    series = pd.to_numeric(series, errors="coerce").fillna(0)

    min_value = series.min()
    max_value = series.max()

    if max_value == min_value:
        return pd.Series(0.0, index=series.index)

    return (
        (series - min_value)
        / (max_value - min_value)
    ) * 100


def build_priority_features(
    tasks: pd.DataFrame,
    assets: pd.DataFrame,
    defects: pd.DataFrame,
    trains: pd.DataFrame,
    today: date | None = None,
) -> pd.DataFrame:
    """
    Build the feature dataframe required by  priority model.

    Expected inputs:
        tasks   -> maintenance task records
        assets  -> asset master records
        defects -> defect records
        trains  -> train movement records
    """

    if today is None:
        today = date.today()

    # Keep today timezone-naive because all DB dates will
    # also be converted to timezone-naive timestamps below.
    today_ts = pd.Timestamp(today)

    tasks = tasks.copy()
    assets = assets.copy()
    defects = defects.copy()
    trains = trains.copy()

    # ---------------------------------------------------------
    # 1. Keep original priority score for reference only
    # ---------------------------------------------------------
    if "priority_score" in tasks.columns:
        tasks["original_priority_score"] = pd.to_numeric(
            tasks["priority_score"],
            errors="coerce",
        )

        tasks = tasks.drop(columns=["priority_score"])
    else:
        tasks["original_priority_score"] = None

    # ---------------------------------------------------------
    # 2. Normalize section IDs exactly like  pipeline
    # ---------------------------------------------------------
    if "section_id" in tasks.columns:
        tasks["section_id"] = (
            tasks["section_id"]
            .astype(str)
            .str.replace("-", "", regex=False)
        )

    if "section_id" in trains.columns:
        trains["section_id"] = (
            trains["section_id"]
            .astype(str)
            .str.replace("-", "", regex=False)
        )

    # ---------------------------------------------------------
    # 3. Train priority -> numeric
    # ---------------------------------------------------------
    if "priority" in trains.columns:
        trains["priority"] = pd.to_numeric(
            trains["priority"],
            errors="coerce",
        )
    else:
        trains["priority"] = 0

    # ---------------------------------------------------------
    # 4. Defect aggregation by asset
    # ---------------------------------------------------------
    if defects.empty:
        defect_features = pd.DataFrame(
            columns=[
                "asset_id",
                "defect_count",
                "critical_defect_count",
                "high_defect_count",
                "overdue_defect_count",
                "repeat_defect_count",
            ]
        )
    else:
        defect_features = (
            defects.groupby("asset_id")
            .agg(
                defect_count=("defect_id", "count"),

                critical_defect_count=(
                    "severity",
                    lambda x: (x == "Critical").sum(),
                ),

                high_defect_count=(
                    "severity",
                    lambda x: (x == "High").sum(),
                ),

                overdue_defect_count=(
                    "is_overdue",
                    lambda x: (
                        x.fillna(False)
                        .astype(bool)
                        .sum()
                    ),
                ),

                repeat_defect_count=(
                    "repeat_defect",
                    lambda x: (
                        x.fillna(False)
                        .astype(bool)
                        .sum()
                    ),
                ),
            )
            .reset_index()
        )

    # ---------------------------------------------------------
    # 5. Train aggregation by section
    # ---------------------------------------------------------
    if trains.empty:
        train_features = pd.DataFrame(
            columns=[
                "section_id",
                "train_count",
                "freight_train_count",
                "high_priority_train_count",
                "critical_train_count",
            ]
        )
    else:
        train_features = (
            trains.groupby("section_id")
            .agg(
                train_count=("movement_id", "count"),

                freight_train_count=(
                    "is_freight",
                    "sum",
                ),

                high_priority_train_count=(
                    "priority",
                    lambda x: (x >= 4).sum(),
                ),

                critical_train_count=(
                    "priority",
                    lambda x: (x == 5).sum(),
                ),
            )
            .reset_index()
        )

    # ---------------------------------------------------------
    # 6. Task + asset merge
    # ---------------------------------------------------------
    df = tasks.merge(
        assets,
        on="asset_id",
        how="left",
        suffixes=("", "_asset"),
    )

    # ---------------------------------------------------------
    # 7. Add defect aggregates
    # ---------------------------------------------------------
    df = df.merge(
        defect_features,
        on="asset_id",
        how="left",
    )

    # ---------------------------------------------------------
    # 8. Add train aggregates
    # ---------------------------------------------------------
    df = df.merge(
        train_features,
        on="section_id",
        how="left",
    )

    # ---------------------------------------------------------
    # 9. Date conversions
    #
    # PostgreSQL may return ISO timestamps containing timezone
    # information. Convert them to UTC first and then remove
    # timezone information so subtraction with today_ts works.
    # ---------------------------------------------------------
    for column in [
        "installation_date",
        "last_maintenance_date",
        "due_date",
        "next_due_date",
    ]:
        if column in df.columns:
            df[column] = (
                pd.to_datetime(
                    df[column],
                    errors="coerce",
                    utc=True,
                )
                .dt.tz_localize(None)
            )

    # ---------------------------------------------------------
    # 10. Time-based features
    # ---------------------------------------------------------
    if "installation_date" in df.columns:
        df["asset_age_years"] = (
            (today_ts - df["installation_date"]).dt.days
            / 365.25
        )
    else:
        df["asset_age_years"] = 0

    if "last_maintenance_date" in df.columns:
        df["days_since_last_maintenance"] = (
            today_ts - df["last_maintenance_date"]
        ).dt.days
    else:
        df["days_since_last_maintenance"] = 0

    if "due_date" in df.columns:
        df["days_until_due"] = (
            df["due_date"] - today_ts
        ).dt.days
    else:
        df["days_until_due"] = 0

    # ---------------------------------------------------------
    # 11. Fill aggregate missing values
    # ---------------------------------------------------------
    df = df.fillna(
        {
            "defect_count": 0,
            "critical_defect_count": 0,
            "high_defect_count": 0,
            "overdue_defect_count": 0,
            "repeat_defect_count": 0,

            "train_count": 0,
            "freight_train_count": 0,
            "high_priority_train_count": 0,
            "critical_train_count": 0,
        }
    )

    # ---------------------------------------------------------
    # 12. C / U / operational impact
    # ---------------------------------------------------------
    df["C"] = pd.to_numeric(
        df.get("criticality", 0),
        errors="coerce",
    )

    df["U"] = pd.to_numeric(
        df.get("urgency", 0),
        errors="coerce",
    )

    df["base_impact"] = pd.to_numeric(
        df.get("operational_impact", 0),
        errors="coerce",
    )

    df[["C", "U", "base_impact"]] = df[
        ["C", "U", "base_impact"]
    ].fillna(0)

    # ---------------------------------------------------------
    # 13. Train pressure
    # ---------------------------------------------------------
    train_pressure = (
        df["train_count"] * 0.4
        + df["high_priority_train_count"] * 0.3
        + df["critical_train_count"] * 0.3
    )

    df["train_pressure"] = normalize(
        train_pressure
    )

    # ---------------------------------------------------------
    # 14. Operational impact score I
    # ---------------------------------------------------------
    df["I"] = (
        0.6 * df["base_impact"]
        + 0.4 * df["train_pressure"]
    )

    # ---------------------------------------------------------
    # 15. Overdue days
    # ---------------------------------------------------------
    df["overdue_days"] = (
        -pd.to_numeric(
            df["days_until_due"],
            errors="coerce",
        )
    ).clip(lower=0)

    overdue_days_score = normalize(
        df["overdue_days"]
    )

    overdue_defect_score = normalize(
        df["overdue_defect_count"]
    )

    # ---------------------------------------------------------
    # 16. Overdue score O
    # ---------------------------------------------------------
    df["O"] = (
        0.6 * overdue_days_score
        + 0.4 * overdue_defect_score
    )

    # ---------------------------------------------------------
    # 17. Calculated priority score
    # ---------------------------------------------------------
    df["calculated_priority_score"] = (
        0.30 * df["C"]
        + 0.25 * df["U"]
        + 0.30 * df["I"]
        + 0.15 * df["O"]
    )

    df["calculated_priority_score"] = (
        df["calculated_priority_score"]
        .clip(0, 100)
    )

    return df