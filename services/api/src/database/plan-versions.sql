-- Plan versions and their audit trail (Approve / Modify / Reject / Replan).
-- Run by the API on first use (CREATE ... IF NOT EXISTS), so an existing
-- database, e.g. Supabase, needs no manual migration.

CREATE TABLE IF NOT EXISTS railopt.planning_runs (
    run_id            VARCHAR(40) PRIMARY KEY,
    version           INTEGER NOT NULL,
    parent_run_id     VARCHAR(40),
    trigger_type      VARCHAR(20) NOT NULL,   -- PLAN | MODIFY | REPLAN
    trigger_detail    JSONB,
    planning_date     DATE,
    horizon_days      INTEGER,
    priority_source   VARCHAR(20),
    priority_run_id   VARCHAR(100),
    model_version     VARCHAR(100),
    solver_status     VARCHAR(30),
    validation_passed BOOLEAN,
    kpis              JSONB,
    result            JSONB NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    decided_by        VARCHAR(100),
    decision_reason   TEXT,
    decided_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_planning_run_parent
        FOREIGN KEY (parent_run_id)
        REFERENCES railopt.planning_runs(run_id),

    CONSTRAINT chk_planning_run_status
        CHECK (status IN ('DRAFT', 'APPROVED', 'REJECTED', 'SUPERSEDED')),

    CONSTRAINT chk_planning_run_trigger
        CHECK (trigger_type IN ('PLAN', 'MODIFY', 'REPLAN'))
);

CREATE INDEX IF NOT EXISTS idx_planning_runs_created
    ON railopt.planning_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS railopt.plan_events (
    event_id    BIGSERIAL PRIMARY KEY,
    run_id      VARCHAR(40) NOT NULL,
    event_type  VARCHAR(30) NOT NULL,     -- CREATED | APPROVED | REJECTED | SUPERSEDED | MODIFIED | REPLANNED
    actor       VARCHAR(100) NOT NULL,
    reason      TEXT,
    details     JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_plan_event_run
        FOREIGN KEY (run_id)
        REFERENCES railopt.planning_runs(run_id)
);

CREATE INDEX IF NOT EXISTS idx_plan_events_run
    ON railopt.plan_events(run_id, created_at);
