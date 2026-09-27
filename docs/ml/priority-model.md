# Priority model (railopt-xgb-priority-v2)

## Where it sits

```
POST /api/planner/plan-blocks
  1. ML service POST /priority/predict  -> scores every task, stored in railopt.priority_predictions
  2. planning context                   -> priority = planner override if present, else latest ML score
  3. optimizer POST /plan-blocks        -> CP-SAT uses the priority as the objective weight
```

If the ML service is unavailable, the planner uses the latest stored ML run (or the dataset `priority_score` when none exists) and the response says so.

## Training

- Data: `data/railopt_raw/07_ml/historical_records.csv` (5000 synthetic records).
- Target: `final_priority`.
- Model: scikit-learn pipeline (one-hot + passthrough) with `XGBRegressor`, seed 42.
- Retrain: from `services/ml`, `PYTHONPATH=src .venv/bin/python -m railopt_ml.priority.training`. Writes `models/priority_model_v2.joblib` and `models/priority_model_v2.json` (features, data hash, metrics, library versions).

Features (known at planning time for a pending task): department, task_type, defect_severity, criticality, urgency, operational_impact, estimated_duration, was_overdue, repeat_defect.

Excluded: `actual_duration`, `delay_to_completion` (only known after the work, would leak the outcome); `weather_risk`, `maintenance_frequency`, `previous_failure_indicator` (no source for pending tasks in the dataset).

Mapping for pending tasks (`planning_features.py`): defect severity and repeat flag come from the task's source defect, otherwise from the most severe unresolved defect on the asset, otherwise LOW / not repeat.

## Measured accuracy (synthetic data)

| Evaluation | MAE (priority points) | R² |
| --- | --- | --- |
| 5-fold CV, XGBoost | 2.60 | 0.905 |
| 5-fold CV, linear regression (reference) | 2.41 | 0.918 |
| 20 % holdout, XGBoost | 2.58 | 0.903 |

Read these numbers with care: in the synthetic dataset `final_priority` is a deterministic function of the record fields (≈ 0.30·criticality + 0.25·urgency + 0.20·operational_impact + defect-severity points + 10 if a previous failure occurred). The model learns that priority policy; the metrics say how well it reproduces the policy from planning-time inputs, not how well it predicts real-world failures. Most of the remaining error comes from `previous_failure_indicator`, which is not available for pending tasks.

## Planner overrides

Tasks with `priority_source = MANUAL_OVERRIDE` keep their planner-set score and reason (compatibility RULE_039: overrides remain auditable); the model does not replace them. In the dataset these are 5 tasks (scores 92–96).

## Priority bands

P1 ≥ 70, P2 60–69, P3 below (`PRIORITY_BANDS` in `services/api/src/services/planning-context.ts`).

Why not the dataset's CRITICAL ≥ 80: the model compresses scores. Pending-task ML scores range 23–77, so a ≥ 80 band would only ever hold the two planner overrides. The bands are set on the model's score distribution instead: P1 is the top ~10% of pending tasks.

On the dataset this gives 19 P1, 58 P2 and 115 P3 pending tasks. Of the 10 tasks the dataset itself marks CRITICAL, 8 are P1 under this band (2 overrides and 6 ML-scored). The other 2 get ML scores of 66 and 67 and land in P2; planner overrides remain the way to force such cases.

Bands only label tasks and feed KPIs; CP-SAT optimises on the score itself.

## Previous model

`manas-xgboost-v1` (removed) was trained on a different dataset whose categories (e.g. `Engineering`, `SEC001`, criticality as High/Medium/Low bands) did not match the RAILOPT data, so its three most important features were always unknown and every task scored ≈ 47.
