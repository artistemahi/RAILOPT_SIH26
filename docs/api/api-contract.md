# Initial API contract skeleton

## Conventions

- Base URL: http://localhost:5000
- Format: JSON
- Public application API owner: Node/Express
- Browser clients call only this API

## Foundation endpoints

| Method | Path | Purpose | Status |
| --- | --- | --- | --- |
| GET | /api | API identity and foundation status | Implemented |
| GET | /health | API liveness | Implemented |
| GET | /api/db-test | PostgreSQL connectivity check | Implemented |
| GET | /api/dashboard | KPIs, top tasks, top candidate window, corridor, alerts for the planning date | Implemented |
| GET | /api/risk | Active tasks ranked by priority score (top 100) with priority inputs | Implemented |
| GET | /api/planner | Block windows (Gantt rows), candidate tasks, planning-input checks, train movements | Implemented |
| POST | /api/planner/plan-blocks | CP-SAT maintenance block plan for PENDING tasks over the planning horizon, with independent validation, KPIs and reasons for unscheduled tasks | Implemented |
| POST | /api/optimize | CP-SAT train departure sequencing (minimum headway per section) | Implemented |
| POST | /api/priority/predict | Run the ML priority model on all tasks and store results | Implemented |
| GET | /api/priority, /api/priority/:taskId | Latest stored ML priority results | Implemented |
| GET | /api/tasks, /api/tasks/:taskId | Tasks joined with asset, section and latest ML priority | Implemented |

Definitions used by the read APIs:

- Active task: status `PENDING`, `SCHEDULED` or `IN_PROGRESS`.
- Priority score: latest ML `final_priority_score` if present, else the dataset `priority_score`. P1 ≥ 80, P2 ≥ 65, else P3.
- Candidate task for a window: its `block_requirements` row points at the window's block, the block type matches, and minimum duration + setup + release fits the window. This is pre-optimization; nothing is scheduled.
- Train impact of a window: train movements on the same section overlapping it in time (Low < 3, Medium 3–6, High ≥ 7).
- Overdue days: planning date − due date, for active tasks.

## Deferred endpoint groups

| Group | Future responsibility | Status |
| --- | --- | --- |
| Scenarios | Submit and retrieve synthetic planning scenarios | Deferred |
| Risk and priority | Request ML-backed risk or priority assessments | Deferred |
| Conflicts | Detect operational conflicts | Deferred |
| Block plans | Generate and inspect optimizer-produced plans | Deferred |
| What-if and emergency replanning | Evaluate changed operating conditions | Deferred |

## Contract placeholders

Before feature endpoints are added, specify:

- Request and response schemas
- Validation rules and error response format
- Idempotency and asynchronous-job behavior where applicable
- API versioning and pagination policy
- Authorization policy when authentication is in scope

## CP-SAT block plan model (`POST /api/planner/plan-blocks`)

Node reads the `railopt.*` tables and posts them to the optimizer service (`POST /plan-blocks`). Horizon: planning date + `PLANNING_HORIZON_DAYS` (default 7).

Candidate window engine (per task–window pair, first failing check is the rejection reason):
`WINDOW_UNAVAILABLE`, `BLOCK_TYPE_MISMATCH` (a `COMBINED_BLOCK` window serves any type, because the dataset links power/traffic/signal tasks to combined blocks), `SECTION_NOT_COVERED` (via `window_sections`), `WINDOW_TOO_SHORT` (minimum duration + setup + release), `RESOURCE_UNAVAILABLE` (mandatory `task_resources`), `TRAIN_CONFLICT` (no train-free gap long enough on the task's section).

Hard constraints: each task at most once; inside its window; no overlap with train movements on its section (overlapping trains merged); one task per section at a time (conservative until a compatibility engine exists); mandatory resource capacity (cumulative); mandatory finish-to-start dependencies between PENDING tasks with minimum gap. SCHEDULED/IN_PROGRESS tasks are not re-planned.

Objective (lexicographic): maximise Σ priority weight of placed tasks; then minimise Σ weight × start so higher-priority work starts earlier.

Independent validator re-checks: TASK_ONCE, WINDOW_VALID, WITHIN_WINDOW, DURATION, SECTION_COVERED, NO_TRAIN_OVERLAP, NO_SECTION_OVERLAP, RESOURCE_CAPACITY, DEPENDENCY_ORDER.

KPIs: tasks scheduled, P1 (score ≥ 80) scheduled, priority-weighted completion, block utilisation = used task-minutes ÷ (available window minutes × sections covered).

Tests: `services/optimizer/tests/test_block_planning.py` (`.venv/bin/python -m pytest` from `services/optimizer`).
