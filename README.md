# RAILOPT — Automatic Maintenance Block Planning (SIH26027)

RAILOPT is a decision-support prototype for **SIH26027: AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations**. It takes maintenance tasks, defects, block windows, train movements and resources, and:

1. scores every task's priority with an **ML model (XGBoost)**;
2. builds a **weekly** block plan to the minute with **OR-Tools CP-SAT** (constraint programming, not ML);
3. builds a **monthly** rough-cut plan (which week each task goes into);
4. re-checks every plan with an **independent validator**;
5. lets a **planner** approve, modify or reject each plan version, run **what-if** scenarios and **emergency replanning**.

The planner is always the final authority: RAILOPT recommends, a human approves.

> **Data:** all data is **synthetic** (`data/railopt_raw/`, 500 maintenance tasks). RAILOPT does **not** connect to TMS, SMMS, TDMS, COA or BDMS; those are shown only as target architecture.

---

## 1. Repository structure

```
RAILOPT_SIH26/
├── start-demo.ps1              One-command launcher (Windows PowerShell): installs, configures and starts everything
├── package.json                Root script: `npm run demo` → start-demo.ps1
├── data/
│   └── railopt_raw/            Synthetic dataset (CSV) — the only data source
│       ├── 01_master/          locations, sections, section_network, assets, resources
│       ├── 02_maintenance/     defects1, maintenance_tasks (500), dependencies, task_resources
│       ├── 03_block_planning/  blocks, block_sections, block_windows (150), window_sections, block_requirements
│       ├── 04_operations/      train_movements (2000, incl. 456 freight)
│       ├── 05_compatibility/   compatibility_rules (RULE_001 … RULE_050)
│       └── 07_ml/              historical_records (5000) — ML training data
├── apps/
│   └── web/                    Frontend: React + Vite + TypeScript + Tailwind
│       └── src/
│           ├── App.tsx             Routes (18 screens)
│           ├── main.tsx            Entry; wraps the app in the shared plan state
│           ├── index.css           Design system (rail theme) + Tailwind
│           ├── constants.ts        Priority bands used for labels (P1 ≥ 70, P2 ≥ 60)
│           ├── ui.tsx              Icons, donut and bar helpers
│           ├── components/rail/    App shell: Sidebar, TopBar, PageHeader, SectionPanel, MetricStrip, DataTable, StatusBadge
│           ├── components/network/ Leaflet map (RailMap)
│           ├── components/risk/    Risk & Priority widgets
│           ├── screens/            Main screens (Overview, Planning Run, Tasks, Blocks, …, Monthly, Versions, Replanning)
│           ├── pages/              What-if, Network Map, Risk & Priority
│           ├── state/PlanContext.tsx  The weekly plan version shown on every plan screen
│           ├── services/           API clients (one per area)
│           ├── hooks/useApi.ts     Small data-loading hook
│           └── types/              TypeScript types of API responses
├── services/
│   ├── api/                    Node.js + Express + TypeScript API (the only thing the browser talks to)
│   │   └── src/
│   │       ├── server.ts, app.ts   Express setup
│   │       ├── config/             env + PostgreSQL pool
│   │       ├── routes/, controllers/  HTTP layer
│   │       ├── services/           Business logic:
│   │       │   ├── planning-context.ts   planning date, active tasks, priority resolution, PRIORITY_BANDS
│   │       │   ├── block-plan.service.ts builds the planning input; ML → CP-SAT; what-if; replan; monthly
│   │       │   ├── plan-versions.service.ts  versions, approve / reject / modify / replan, audit log
│   │       │   ├── workspace.service.ts  backlog, block windows, data sources, data quality, settings
│   │       │   ├── dashboard / risk / network / priority / tasks services
│   │       ├── integrations/       HTTP client for the Python services; Redis / MinIO clients (optional)
│   │       └── database/
│   │           ├── schema.sql          PostgreSQL schema (railopt.*)
│   │           ├── plan-versions.sql   Plan versions + audit tables (created automatically by the API)
│   │           ├── dataset-files.ts    CSV file → table mapping
│   │           └── importDataset.ts    CSV importer (`npm run import`)
│   ├── ml/                     Python FastAPI ML service (port 8001)
│   │   ├── models/                 priority_model_v2.joblib + .json model card
│   │   ├── src/railopt_ml/priority/  features, training, model service
│   │   ├── src/railopt_ml/api/     /priority/predict, /priority/model
│   │   └── tests/
│   └── optimizer/              Python FastAPI optimizer service (port 8002)
│       ├── src/railopt_optimizer/block_planning/
│       │   ├── model.py            Planning input → minute-based problem
│       │   ├── candidates.py       Candidate windows per task + rejection reasons
│       │   ├── compatibility.py    NetworkX conflict / coordination graph
│       │   ├── solver.py           CP-SAT weekly model
│       │   ├── validator.py        Independent validator (13 checks)
│       │   ├── service.py          Pipeline + KPIs, downtime, output shaping
│       │   ├── what_if.py          Scenario changes + baseline vs scenario
│       │   ├── replan.py           Emergency replanning / planner edits
│       │   └── monthly.py          Monthly rough-cut CP-SAT + its checker
│       ├── src/railopt_optimizer/api/routes/  /plan-blocks, /what-if, /replan, /plan-month
│       └── tests/                  41 pytest tests
└── docs/
    ├── api/api-contract.md     Endpoints, model details, rules modelled / not modelled
    ├── ml/priority-model.md    ML model card: features, metrics, bands
    ├── architecture/, assumptions/, demo/
```

Folders `experiments/`, `infra/`, `scripts/` are placeholders. A few older files from the first prototype remain but are not used by the current screens: `services/optimizer/.../optimization`, `simulation`, `validation` and `routes/optimize.py` (the early train-delay optimizer behind `POST /api/optimize`), `GET /api/planner`, and `services/api/database/*.py`.

---

## 2. Tools and technologies (exact versions used)

| Layer | Tool | Version | Used for |
|---|---|---|---|
| Frontend | React / React DOM | 19.2 | UI |
| | React Router | 7.18 | Page routes |
| | Vite | 7.3 | Dev server and build |
| | TypeScript | 5.9 | Types |
| | Tailwind CSS | 4.3 | Styling (with a custom rail design system in `index.css`) |
| | Leaflet | 1.9.4 | Network map (OpenStreetMap tiles need internet) |
| API | Node.js | 20+ (tested on 22.22) | Runtime |
| | Express | 5.2 | HTTP API |
| | pg (node-postgres) | 8.23 | PostgreSQL client |
| | tsx | 4.23 | Run TypeScript in dev (`npm run dev`) |
| | csv-parse | 7.0 | CSV import and CSV row counts |
| | dotenv | 16.6 | `.env` loading |
| Database | PostgreSQL | 16 (tested) — or Supabase (PostgreSQL) | All data, ML predictions, plan versions, audit log |
| ML service | Python | 3.10+ (tested on 3.11) | Runtime |
| | FastAPI / Uvicorn | 0.141 / 0.54 | HTTP service |
| | XGBoost | 3.2 | Priority model |
| | scikit-learn | 1.9.1 | Pipeline, encoding, cross-validation |
| | pandas / NumPy / joblib | 3.0 / 2.4 / 1.6 | Data handling, model file |
| Optimizer | Google OR-Tools (CP-SAT) | 9.15 | Weekly plan, monthly plan, what-if, replanning |
| | NetworkX | 3.6 | Compatibility / conflict graph |
| | FastAPI / Uvicorn / Pydantic | 0.141 / 0.54 / 2.13 | HTTP service and input validation |
| Tests | pytest | 9.1 | ML (4) and optimizer (41) tests |
| Optional | Redis, MinIO | — | Health checks only; the demo does not need them |

### How the parts talk

```
Browser (React, :5173)
   │  only talks to
   ▼
Node API (:5000) ── reads/writes ──► PostgreSQL / Supabase (schema railopt)
   │                                   (tasks, windows, trains, ML scores, plan versions, audit log)
   ├──► ML service (:8001)        POST /priority/predict  → priority score per task (XGBoost)
   └──► Optimizer (:8002)         POST /plan-blocks  weekly CP-SAT plan + validation
                                  POST /plan-month   monthly rough-cut
                                  POST /what-if      baseline vs scenario
                                  POST /replan       emergency replanning / modifications
```

---

## 3. How to run

### 3.1 What you need to install

| Need | Why | Check |
|---|---|---|
| **Node.js 20 or newer** (includes npm) | Frontend and API | `node -v` |
| **Python 3.10 or newer** (`py` or `python` on PATH) | ML and optimizer services | `py --version` / `python --version` |
| **PostgreSQL 14+** running locally, **or** a Supabase project | Database | `psql --version` |
| **Windows PowerShell** | Only for the one-command launcher (`start-demo.ps1`) | — |
| Internet (first run) | npm / pip downloads, map tiles | — |

Everything else (npm packages, Python packages, virtual environments, `.env` files) is installed or created automatically by `start-demo.ps1`.

### 3.2 Database (once)

**Option A — local PostgreSQL**

```powershell
psql -U postgres -c "CREATE DATABASE railopt"
psql -U postgres -d railopt -f services/api/src/database/schema.sql
```

**Option B — Supabase:** run the contents of `services/api/src/database/schema.sql` in the Supabase SQL editor.

Then point the API to the database. Put the connection string in `services/api/.env`; the launcher creates this file from `.env.example` on first run.

```
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/railopt
```

For Supabase, use the project's PostgreSQL connection string. Supabase requires SSL; with node-postgres this is usually `?sslmode=no-verify` at the end of the URL. This setup was not tested from this repository, so check it on your machine.

**Load the synthetic dataset** (all CSVs from `data/railopt_raw/` → `railopt.*` tables):

```powershell
npm install --prefix services/api
npm run import --prefix services/api
```

The plan-version tables (`railopt.planning_runs`, `railopt.plan_events`) are created automatically by the API the first time a plan is generated.

### 3.3 Start everything (one command, Windows)

From the repository root:

```powershell
npm run demo
```

or `powershell -ExecutionPolicy Bypass -File .\start-demo.ps1`.

The launcher:

1. installs npm dependencies for `apps/web` and `services/api` (first run only);
2. creates `.venv` for `services/ml` and `services/optimizer` and installs their `requirements.txt`, reinstalling only when that file changes;
3. creates `services/api/.env` and `apps/web/.env` from the `.env.example` files if they are missing;
4. starts each service in its own window titled `RAILOPT - <service>`, reusing any service already running on its port;
5. waits for the health checks and prints `Demo: ready at http://localhost:5173/overview`.

| Service | Port | Health |
|---|---:|---|
| Frontend (Vite) | 5173 | `GET /` |
| Node API | 5000 | `GET /health` |
| ML service | 8001 | `GET /health` |
| Optimizer | 8002 | `GET /health` |

To stop, close the `RAILOPT - …` windows (or press Ctrl+C in each).

### 3.4 Manual start (any OS)

```bash
# once
npm install --prefix apps/web
npm install --prefix services/api
python -m venv services/ml/.venv
python -m venv services/optimizer/.venv
services/ml/.venv/bin/pip install -r services/ml/requirements.txt              # Windows: .venv\Scripts\pip
services/optimizer/.venv/bin/pip install -r services/optimizer/requirements.txt
cp services/api/.env.example services/api/.env    # then set DATABASE_URL
cp apps/web/.env.example apps/web/.env

# four terminals
npm run dev --prefix services/api
npm run dev --prefix apps/web
cd services/ml && .venv/bin/python -m uvicorn railopt_ml.app:app --app-dir src --port 8001
cd services/optimizer && .venv/bin/python -m uvicorn railopt_optimizer.app:app --app-dir src --port 8002
```

Open `http://localhost:5173`.

### 3.5 Settings (`services/api/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | — (required) | PostgreSQL / Supabase connection |
| `PORT` | 5000 | API port |
| `CORS_ORIGIN` | http://localhost:5173 | Frontend origin |
| `ML_SERVICE_URL` | http://localhost:8001 | ML service |
| `OPTIMIZER_SERVICE_URL` | http://localhost:8002 | Optimizer |
| `PLANNING_DATE` | first day with block windows (2026-09-14) | Start of the planning horizon |
| `PLANNING_HORIZON_DAYS` | 7 | Weekly plan length |
| `MONTHLY_PLAN_WEEKS` | 5 | Default monthly plan length |

`apps/web/.env`: `VITE_API_BASE_URL=http://localhost:5000`.

### 3.6 Tests and checks

```bash
cd services/optimizer && .venv/bin/python -m pytest -q     # 41 tests
cd services/ml && .venv/bin/python -m pytest -q            # 4 tests
npm run typecheck --prefix services/api
npm run build --prefix apps/web
```

Retrain the ML model (optional; the trained model is committed):

```bash
cd services/ml && PYTHONPATH=src .venv/bin/python -m railopt_ml.priority.training
```

---

## 4. How the planning works (short)

1. **Priority (ML):** the XGBoost model (`railopt-xgb-priority-v2`) predicts a 0–100 score from department, task type, defect severity, criticality, urgency, operational impact, estimated duration, overdue flag and repeat-defect flag. It is trained on `historical_records.csv`: holdout MAE 2.58, R² 0.90. A **planner override** always wins over the ML score. Bands: **P1 ≥ 70, P2 60–69, P3 < 60**; P1 is the top ~10% of pending tasks. Details: `docs/ml/priority-model.md`.
2. **Candidate windows:** for every pending task and block window the engine checks:
   - section status;
   - electrification (TRD work);
   - window availability;
   - block type;
   - section coverage;
   - block max duration;
   - duration including setup and release;
   - resources, skills and department;
   - a train-free gap long enough.

   Every rejected pair keeps its reason.
3. **Compatibility graph (NetworkX):** marks pairs that conflict and pairs that may work together:
   - shared resource (RULE_011);
   - same asset;
   - dependency (RULE_016);
   - repair before testing (RULE_032/033);
   - may coordinate (RULE_001/034) — different departments on one section at the same time.
4. **Weekly CP-SAT:** each task is placed at most once, only inside train-free time, within resource capacity, one job per asset at a time, and dependencies in order. It maximises priority-weighted tasks and starts higher priority earlier.
5. **Independent validator:** 13 checks run again on the result without using the solver code.
6. **Monthly rough cut (CP-SAT):** task → week within each week's window capacity, due dates and dependency order. Only week 1 has real windows and trains in the dataset; later weeks repeat the week-1 pattern. This is an assumption and is shown on screen.
7. **Human decision:** every plan is a version (DRAFT). A planner approves, rejects (with reason) or modifies it; every action goes into the audit log. Emergency replanning starts from the approved weekly plan.

Only **PENDING** tasks are planned (192 of 500). SCHEDULED and IN_PROGRESS tasks count as already committed.

---

## 5. Honest limitations

- Synthetic data only; no live railway system is connected. No login or authentication: the planner types a name, which is stored in the audit log.
- Block windows, train movements and resource availability exist for **one week** only; monthly weeks 2+ are projected.
- All train movements in the dataset are "SCHEDULED"; there is no separate goods-train forecast. Freight trains are counted, not forecast.
- The ML label in the synthetic data is a formula of the record fields. The model learns that formula well, but real-world accuracy is unknown.
- Approval records a decision; it does not send anything to BDMS or any other system.
- Some compatibility rules are not modelled (RULE_017, 022–024, 025/030, 031, 035–040, 042, 047–048); see `docs/api/api-contract.md`.
- Map tiles need internet.

---

## 6. Every screen, in detail

The left **sidebar** has three groups: Operational Planning, Analysis, and Platform & Governance.

The **top bar** always shows:
- the page name and a **SYNTHETIC DATA** tag;
- the **planning date**;
- the **horizon** (7 days);
- **PLAN IN VIEW**: the weekly plan version all plan screens are showing, for example `V3 · APPROVED · OPTIMAL`;
- **SERVICES**: "All up" if the ML and optimizer services answer, otherwise how many are down.

**Which plan is shown:** all plan screens show one shared weekly plan version. On startup this is the **approved** weekly version, or the newest one if none is approved. It changes when you generate a new plan, create a modified or replanned version, or click **Show in all screens** on the Versions page.

**Sidebar badges:**
- **Validation:** PASS / FAIL of the plan in view.
- **Versions & Approval:** its version number (orange = draft, green = approved).

**Recommended demo flow:** Planning Run → Generate → Versions & Approval → Approve → Replanning (disruption) → Approve new version → Monthly Plan → Generate → Approve.

### 6.1 Command Center (`/overview`)

The landing page.

- **Header buttons:**
  - **Task backlog** opens Maintenance Tasks.
  - **Generate plan / Re-run plan** runs ML → CP-SAT and saves a new weekly draft version.
- **Metric strip:** total assets; high-priority active tasks; available windows on the planning date; asset availability (share of ACTIVE assets); train impact on the planning date.
- **Highest-priority pending tasks:** top 10 pending tasks with work, department, section, priority band + score and overdue days. **All tasks →** opens Maintenance Tasks.
- **Plan in view:** solver status, validation, tasks scheduled and priority-weighted completion of the current weekly version. Buttons **Schedule** and **Versions & approval**.
- **Best candidate window on the planning date:** a simple ranking before optimization — window, section, time, duration, how many tasks fit, train impact.
- **Task status:** counts of all 500 tasks by status.
- **Train impact of windows:** donut of windows by overlapping trains (low / medium / high).
- **Stations on the planning date:** busy / blocked / normal per station.
- **Alerts:** open critical defects, overdue work and unavailable windows, straight from the data.

### 6.2 Planning Run (`/planning`)

Where a weekly plan is generated.

- **Stepper:** ML priority → Candidate windows → Compatibility graph → CP-SAT → Independent validation → Planner review. It shows progress while solving.
- **Metric strip:** pending tasks to plan; already committed tasks (not re-planned); block windows in the horizon (and how many are available); horizon; solver time limit.
- **Generate plan (ML → CP-SAT):**
  1. The ML service scores every task (if it is down, the last stored ML run is used and a note says so).
  2. CP-SAT solves the plan.
  3. The validator checks it.
  4. The result is saved as a new **DRAFT** version.
- **Run result:** version, created time, priority source (model version), solver status and time, validation, tasks scheduled, priority-weighted completion. Buttons **Review & approve** (Versions), **Open schedule**, **Solver details**, **Validation**.

### 6.3 Maintenance Tasks (`/tasks`)

The active backlog: 294 tasks, of which 192 are PENDING.

- **Filters:**
  - status chips PENDING / SCHEDULED / IN_PROGRESS / ALL (with counts);
  - department dropdown;
  - search box (task, asset, work, section).
- **Table:** task, work, department, section, priority (band · score), priority source (ML / OVERRIDE / DATASET), overdue days, and **Plan** — the chosen window if scheduled, "Not selected" if it had windows but lost to higher-weight work, or "No window" if nothing fits.
- **Click a row** to fill the right panel:
  - asset, section, department, status, due date, open defects, priority score and source, and the override reason if any;
  - for PENDING tasks after a plan: **candidate windows** (the chosen one marked), **rejected windows** counted by reason (train conflict, window too short, …), up to 5 example messages, and why the task was not scheduled.

### 6.4 Block Windows (`/blocks`)

All block windows in the horizon, from `block_windows.csv`.

- **Metric strip:** windows; available windows; available minutes; windows with high train impact (≥ 7 trains); windows used by the plan in view.
- **Filters:** **All days** or one day; **Available only** checkbox.
- **Table:** window, block type, sections covered, start, minutes, trains overlapping (coloured by impact), **freight** trains among them, status, tasks planned in it.
- **Click a row:** window details (block, type, sections, time, duration, trains and freight, pending tasks on those sections, status) and the list of tasks the plan put in that window, with times.

### 6.5 Coordination (`/compatibility`)

The compatibility / conflict graph of the plan in view. Needs a generated plan; otherwise it shows a **Generate plan** button.

- **Metric strip:** number of edges per relation (shared resource, same asset, repair → test order, dependency, can coordinate) and parallel multi-department pairs in the plan.
- **Edges table:** task A, task B, relation, rule, detail (resource, asset, gap or window). Filter by relation type or search a task id.
- **What each relation means:** rule explanations.
- **Multi-department work in the plan:** section, tasks, departments and window where different departments work at the same time. This is the coordination the PS asks for.
- **Graph checks:** dependency cycles (RULE_020), successor-due-before-predecessor (RULE_019), assets with several jobs, repair → test orders.

### 6.6 Optimization (`/optimizer`)

Solver details of the plan in view.

- **Metric strip:** status (OPTIMAL / FEASIBLE), wall time, variables, constraints, candidate pairs (and rejected pairs).
- **Model:** decision variables, hard constraints and objective in plain words.
- **Priority input:** source, model version, run id, and P1 (score ≥ 70) scheduled vs total.
- **Effect of the compatibility engine:** the same inputs solved twice — one task per section at a time vs compatibility-aware — with tasks, P1, priority-weighted completion and utilisation side by side. Both plans are validated.
- **Why task-window pairs were rejected:** bar list by reason.
- **Not scheduled:** every unscheduled task with reason code and explanation.

### 6.7 Weekly Schedule (`/schedule`)

The weekly plan as a Gantt chart.

- **Day chips** (14 Sept · 14 tasks …) choose the day.
- **Legend:** department colours (Engineering, TRD, S&T); dashed blue = available block window.
- **Gantt:** one row per section. Blue bands are available windows; coloured bars are tasks; "N parallel" means tasks of different departments working together. **Hover** a bar for task, department, time, window and priority; **click** it to highlight it.
- **All scheduled tasks** table (task, department, section, window, block, start, end, priority). **Click a row** to jump to that task's day and highlight it.

### 6.8 Monthly Plan (`/monthly`)

The long-term view (PS: weekly and monthly plans).

- **Header:** choose **4 / 5 / 6 weeks** and click **Generate monthly plan** (or **Re-run**). ML scores the tasks, CP-SAT assigns each pending task to a week, and the result is saved as a **monthly** version.
- **How to read this plan:** the assumptions — week 1 is dataset data, weeks 2+ repeat its pattern, and the rough cut has no minute-level times.
- **Metric strip:** version and status, tasks planned, priority-weighted completion, overdue tasks cleared, tasks planned after their due week, check result (PASS / FAIL, solver time).
- **Weeks:** one card per week with dates, dataset/projected tag, task count, split by department, and minutes used vs train-free capacity. **Click a card** to filter the task list to that week; click again to show all weeks.
- **Section load by week:** heat table of planned minutes / capacity per section and week (darker = fuller).
- **Link to the weekly plan:** tasks in monthly week 1 vs tasks in the exact weekly plan, and how many are in both. **Open weekly schedule** opens the Gantt.
- **Planner decision:** approve or reject the monthly version (planner name required; reason required to reject). Approving a monthly plan does not affect the weekly plan.
- **Planned tasks:** week, task, department, section, pattern window, priority, due date, and whether it is by its due week or N weeks after.
- **Block requests:** per section, tasks that no window can hold, their departments, the block length they need, and the longest train-free gap available. Use it as input for requesting longer blocks.
- **Not planned this month:** each task with its reason: window too short, resource unavailable, train conflict, predecessor not planned, or no capacity left.

### 6.9 Validation (`/validation`)

- **Metric strip:** PASS / FAIL, checks run, violations, assignments checked.
- **Checks table:** the 13 checks with the rule each one enforces and its violation count: task once, window valid, within window, duration, section covered, section status, block capacity, no train overlap, no asset overlap, task type order, resource match, resource capacity, dependency order.
- **Violations** table (only if any): check, task, message.

### 6.10 Versions & Approval (`/versions`)

Plan governance.

- **Generate new version:** a new weekly draft.
- **Versions table:** version, plan type (Weekly / Monthly), type (Generated / Planner modification / Emergency replan), status (DRAFT / APPROVED / REJECTED / SUPERSEDED), tasks scheduled, priority-weighted completion, validation, created time. **Click a row** to open it on the right.
- **Version panel:**
  - status, solver, validation, tasks scheduled, what changed (disruptions, pins, freeze time);
  - **Show in all screens** makes this weekly version the plan in view; for monthly versions, **Open monthly plan**.
  - **Planner name** (saved in this browser) and **Reason**.
  - **Approve** needs a planner name and a passed validation; the previously approved plan of the same type becomes SUPERSEDED.
  - **Reject** needs a reason.
- **Compared with parent:** for modified or replanned versions, KPIs side by side with the change, and a diff of frozen / unchanged / moved / added / dropped tasks.
- **Modify** (weekly drafts or the approved weekly plan):
  - **Put a task in a specific window** — only feasible windows are offered;
  - **Other edits** — remove a task, change a task's priority, close a window;
  - add a reason and click **Create modified version**. CP-SAT re-solves close to the parent, and a new draft is created and shown everywhere. The parent is not changed.
- **Disruption on the approved plan?** → **Open emergency replanning**.
- **Audit log:** time, version, event (CREATED, APPROVED, REJECTED, SUPERSEDED, MODIFIED, REPLANNED), who, reason.

### 6.11 What-if (`/what-if`)

Try changes without creating a version.

- **Change** dropdown:
  - close a block window;
  - shorten a window by N minutes;
  - make a resource unavailable;
  - a task takes N minutes longer;
  - change a task's priority;
  - remove a task;
  - add a train movement on a section (start and end time).

  Fill the fields and click **Add change**; repeat for several changes. Remove one with ×.
- **Run simulation:** the current input (baseline) and the changed input (scenario) are both solved deterministically, so every difference comes from your changes. The scenario keeps tasks in their baseline window where it can.
- **Results:**
  - **Baseline vs scenario** table: tasks scheduled, P1, priority-weighted completion, utilisation, solver / validation;
  - lists of **Newly scheduled**, **No longer scheduled** (with reason), **Moved** (from → to) and the unchanged count.

### 6.12 Replanning (`/replanning`)

Emergency replanning of the **approved weekly** plan. If no weekly plan is approved, the page links to Versions.

- **Metric strip:** plan in force (version, approved by), scheduled, priority-weighted, horizon.
- **1 · Disruption:**
  - **Disruption time:** work that started before it is **frozen** — kept exactly, still using its asset and resources — and no new work may start before it.
  - **What happened:** window lost, window shortened, resource unavailable, extra train, task takes longer, or priority changed. Click **Add** for each.
  - **Planner name** and **Reason / incident description**, then **Replan V<n>**.
- **2 · Proposed V<n+1>:** solver and validation result; KPI comparison old vs new; badges for frozen / unchanged / moved / added / dropped; tables of dropped tasks (with reason), moved tasks (from → to), added tasks and frozen tasks. The new version is shown on all plan screens.
- **3 · Planner decision:** **Approve** (the old plan becomes SUPERSEDED) or **Reject** with a reason. Links: **View schedule**, **Modify in plan versions**.
- Disruptions, pins and the freeze time carry forward: later modifications keep them, and a new disruption cannot be earlier than the previous freeze time.

### 6.13 Analytics (`/analytics`)

Breakdowns of the plan in view.

- **Metric strip:** tasks scheduled, tasks with a feasible window, priority-weighted completion, block utilisation, parallel multi-department pairs.
- Bar lists (scheduled / pending):
  - by priority band;
  - by department;
  - by section;
  - by task type;
  - planned work minutes by section;
  - tasks started per day.
- **Asset downtime from planned maintenance:** assets worked, planned downtime minutes, outages (asset × window — several jobs on one asset in one window count once), assets with bundled jobs, availability of the worked assets over the horizon, and the assets with the most downtime.

### 6.14 Risk & Priority (`/risk`)

The priority view of all active tasks.

- **Summary cards:** P1 / P2 / P3 counts and active tasks.
- **Filters:** department, priority, section, and **Clear Filters**.
- **Maintenance Priority List:** task, asset, work, department, section, priority score (bar coloured by band), priority, overdue days, status (Attention Required / Monitor / Normal).
- **Click a row** for the details panel:
  - task, asset, department, section, priority score, override reason, overdue days, asset condition;
  - **Priority inputs:** criticality, urgency, operational impact, asset condition, open defects;
  - **Planning guidance:** priority level, urgency band, status.

### 6.15 Network Map (`/network`)

Leaflet map of stations and sections. Tiles need internet.

- **Mode buttons:**
  - **Maintenance priority:** red = has P1 work, amber = P2, green = P3 only; line width = active tasks.
  - **Train load:** sections by trains on the planning date, in thirds.
  - **Block plan:** needs a plan; blue intensity = tasks planned that day. Day buttons pick the day.
- **Load block plan (ML → CP-SAT)** generates a weekly plan (a new draft version) and switches to Block plan mode.
- **Hover** a section or station for a tooltip; **click a section** for its panel: length, tracks, electrified, status, active tasks (P1 / P2), open critical defects, out-of-service assets, available windows, trains on the planning date, tasks planned that day (in Block plan mode), and its highest-priority tasks.
- A section that passes over another station is drawn as an arc so the lines do not hide each other.

### 6.16 Data Sources (`/integration`)

- **Metric strip:** CSV files, rows in PostgreSQL, files where CSV ≠ table, stored ML priority runs.
- **Pipeline:** Synthetic CSVs → Importer → PostgreSQL → ML · CP-SAT · UI.
- **Current sources (live row counts):** each CSV, its table, CSV rows vs table rows, Match / Differs. `task_resources.csv` differs (1509 → 1507) because it has two duplicate task/resource pairs.
- **Target architecture (not connected):** TMS, SMMS, TDMS, COA with their roles, clearly marked "Target".

### 6.17 Data Quality (`/quality`)

Integrity checks run live on the database each time the page opens.

- **Metric strip:** checks, pass, warnings, failures.
- **Checks:**
  - references: tasks → assets / sections, dependencies → tasks, task resources → resources, trains → sections;
  - time order: windows, trains, resources, due vs reported date;
  - window duration consistency;
  - task duration present;
  - pending tasks without a block requirement;
  - asset condition range;
  - locations without coordinates;
  - pending tasks already overdue;
  - CSV rows skipped on import.

  Each check shows affected rows and PASS / WARN / FAIL. WARN is informational (for example, overdue work is expected in the data).

### 6.18 Settings (`/settings`)

Read-only effective configuration:

- planning date and where it comes from;
- horizon;
- priority bands (P1 ≥ 70, P2 60–69, P3 < 60);
- train-impact bands;
- solver engine, time limit and what-if mode;
- ML model card: version, training date, training rows, cross-validation and holdout MAE / R², label note;
- health of the API, ML and optimizer services with their URLs.

---

## 7. API reference (short)

All endpoints are under `http://localhost:5000/api`. Full details are in `docs/api/api-contract.md`.

| Endpoint | Purpose |
|---|---|
| `GET /dashboard`, `/risk`, `/network`, `/backlog`, `/block-windows` | Screen data |
| `GET /data/sources`, `/data/quality`, `/settings` | Data sources, integrity checks, configuration |
| `GET /plans`, `POST /plans` `{actor, type?: "MONTHLY", weeks?}` | List / generate plan versions |
| `GET /plans/:id`, `/plans/:id/events`, `/plans/events` | One version, audit log |
| `POST /plans/:id/approve`, `/reject`, `/modify`, `/replan` | Planner decisions and new versions |
| `POST /planner/plan-blocks` | Weekly plan without saving a version |
| `GET /planner/what-if/options`, `POST /planner/what-if` | What-if |
| `POST /priority/predict`, `GET /priority`, `GET /tasks` | ML scoring and stored predictions, tasks |
| `GET /health` (no `/api`) | API health |
