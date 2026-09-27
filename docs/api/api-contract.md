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
| GET | /api/network | Stations and sections with coordinates and per-section planning signals (active tasks by priority, open critical defects, out-of-service assets, available windows in the horizon, trains on the planning date) | Implemented |
| GET | /api/planner/what-if/options | Windows, resources, pending tasks and sections for building a scenario | Implemented |
| POST | /api/planner/what-if | Solve the current plan and a changed scenario; return KPIs for both and the task-level difference | Implemented |
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
`SECTION_INACTIVE` (RULE_050) and `NOT_ELECTRIFIED` (RULE_049, TRD work) at task level; then `WINDOW_UNAVAILABLE`, `BLOCK_TYPE_MISMATCH` (a `COMBINED_BLOCK` window serves any type, because the dataset links power/traffic/signal tasks to combined blocks), `SECTION_NOT_COVERED` (via `window_sections`), `BLOCK_CAPACITY` (RULE_008), `WINDOW_TOO_SHORT` (minimum duration + setup + release), `RESOURCE_UNAVAILABLE` (mandatory resource unavailable, capacity, skill RULE_012, department RULE_014, availability), `TRAIN_CONFLICT` (no train-free gap long enough on the task's section).

Compatibility engine (NetworkX graph over tasks with candidates):

| Edge | Rule | Effect in CP-SAT |
| --- | --- | --- |
| SHARED_RESOURCE | RULE_011 | cumulative resource capacity |
| SAME_ASSET | RAILOPT assumption | no overlap on one asset |
| DEPENDENCY | RULE_016 | finish-to-start with minimum gap |
| TASK_TYPE_ORDER | RULE_032/033 | repair/replacement ends before testing starts on the same asset |
| COORDINATION | RULE_001/034 | same section, shared window, no conflict: may run in parallel |

It also reports dependency cycles (RULE_020) and successor-due-before-predecessor pairs (RULE_019).

Hard constraints: each task at most once; start only inside a train-free gap of its window on its section; compatibility conflicts above; mandatory resource capacity; mandatory dependencies between PENDING tasks. SCHEDULED/IN_PROGRESS tasks are not re-planned.

Objective (lexicographic): maximise Σ priority weight of placed tasks; then minimise Σ weight × start so higher-priority work starts earlier.

`compare_modes: true` (sent by the API) solves the same inputs a second time with one task per section at a time and returns both KPI sets under `comparison`.

Independent validator (no CP-SAT or compatibility code) re-checks: TASK_ONCE, WINDOW_VALID, WITHIN_WINDOW, DURATION, SECTION_COVERED, SECTION_STATUS, BLOCK_CAPACITY, NO_TRAIN_OVERLAP, NO_ASSET_OVERLAP, TASK_TYPE_ORDER, RESOURCE_MATCH, RESOURCE_CAPACITY, DEPENDENCY_ORDER (+ SECTION_EXCLUSIVE for the comparison model).

KPIs: tasks scheduled, P1 (score ≥ 80) scheduled, priority-weighted completion, block utilisation = used task-minutes ÷ (available window minutes × sections covered), multi-department task pairs working in parallel.

Compatibility rules not modelled: RULE_017 start-to-start (no such dependencies in the dataset), RULE_022–024 train priority/density/status preferences, RULE_025/030 approval (outside optimizer authority; the plan is a recommendation), RULE_031 inspection-before-repair and RULE_035–040 priority preferences (the objective uses the priority score), RULE_042 hard due dates, RULE_047–048 network contiguity and direction.

Tests: `services/optimizer/tests/test_block_planning.py` (`.venv/bin/python -m pytest` from `services/optimizer`).

## What-if simulation (`POST /api/planner/what-if`)

Body: `{ "changes": [ ... ] }`, up to 20 changes:

| type | fields | effect |
| --- | --- | --- |
| WINDOW_UNAVAILABLE | window_id | window cannot be used |
| WINDOW_SHORTEN | window_id, minutes | window ends earlier |
| RESOURCE_UNAVAILABLE | resource_id | resource status set to unavailable |
| TASK_DURATION | task_id, minutes | work time of a pending task increases |
| TASK_PRIORITY | task_id, priority_score | priority 0–100 |
| TASK_REMOVE | task_id | task left out of planning |
| TRAIN_ADD | section_id, start_time, end_time | extra train occupation |

Baseline and scenario use the same inputs and stored priorities (no new ML run) and are solved deterministically (one CP-SAT worker, fixed seed), so with no changes the difference is empty. The scenario objective prefers keeping tasks in their baseline window when that costs no priority weight, so only affected work moves. Response: `changes`, `baseline` and `scenario` (solver, validation, kpis), `diff` (`added`, `removed` with reasons, `moved`, `unchanged`), `scenario_assignments`. Invalid changes return 422 with the reason.
