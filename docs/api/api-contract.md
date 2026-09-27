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
