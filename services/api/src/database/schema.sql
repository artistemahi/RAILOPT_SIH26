-- =========================================================
-- RAILOPT PostgreSQL Database Schema
-- SIH26027
-- =========================================================

CREATE SCHEMA IF NOT EXISTS railopt;

SET search_path TO railopt;

-- =========================================================
-- 1. MASTER TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS locations (
    location_id      VARCHAR(50) PRIMARY KEY,
    station_code     VARCHAR(50),
    name             VARCHAR(150) NOT NULL,
    latitude         NUMERIC(9,6),
    longitude        NUMERIC(9,6)
);

CREATE TABLE IF NOT EXISTS sections (
    section_id          VARCHAR(50) PRIMARY KEY,
    section_code        VARCHAR(50) UNIQUE,
    from_location_id    VARCHAR(50) NOT NULL,
    to_location_id      VARCHAR(50) NOT NULL,
    length_km           NUMERIC(10,2),
    track_count         INTEGER,
    electrified         BOOLEAN,
    operational_status  VARCHAR(50),

    CONSTRAINT fk_section_from_location
        FOREIGN KEY (from_location_id)
        REFERENCES locations(location_id),

    CONSTRAINT fk_section_to_location
        FOREIGN KEY (to_location_id)
        REFERENCES locations(location_id),

    CONSTRAINT chk_section_locations_different
        CHECK (from_location_id <> to_location_id),

    CONSTRAINT chk_section_length
        CHECK (length_km IS NULL OR length_km >= 0),

    CONSTRAINT chk_section_track_count
        CHECK (track_count IS NULL OR track_count > 0)
);

CREATE TABLE IF NOT EXISTS section_network (
    edge_id             VARCHAR(50) PRIMARY KEY,
    section_id          VARCHAR(50) NOT NULL,
    from_location_id    VARCHAR(50) NOT NULL,
    to_location_id      VARCHAR(50) NOT NULL,
    directionality      VARCHAR(30),

    CONSTRAINT fk_network_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT fk_network_from_location
        FOREIGN KEY (from_location_id)
        REFERENCES locations(location_id),

    CONSTRAINT fk_network_to_location
        FOREIGN KEY (to_location_id)
        REFERENCES locations(location_id)
);

CREATE TABLE IF NOT EXISTS assets (
    asset_id               VARCHAR(50) PRIMARY KEY,
    asset_type              VARCHAR(100),
    department              VARCHAR(50),
    section_id              VARCHAR(50) NOT NULL,
    location_code            VARCHAR(50),
    criticality             NUMERIC(6,2),
    status                   VARCHAR(50),
    installation_date       DATE,
    last_maintenance_date   DATE,
    next_due_date           DATE,
    condition_score         NUMERIC(6,2),

    CONSTRAINT fk_asset_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT chk_asset_criticality
        CHECK (criticality IS NULL OR criticality BETWEEN 0 AND 100),

    CONSTRAINT chk_asset_condition
        CHECK (condition_score IS NULL OR condition_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS resources (
    resource_id         VARCHAR(50) PRIMARY KEY,
    resource_type       VARCHAR(100),
    department          VARCHAR(50),
    section_id          VARCHAR(50),
    capacity            INTEGER,
    availability_start  TIMESTAMP,
    availability_end    TIMESTAMP,
    status              VARCHAR(50),
    skills              VARCHAR(100),
    resource_name       VARCHAR(150),
    home_location_id    VARCHAR(50),

    CONSTRAINT fk_resource_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT fk_resource_home_location
        FOREIGN KEY (home_location_id)
        REFERENCES locations(location_id),

    CONSTRAINT chk_resource_capacity
        CHECK (capacity IS NULL OR capacity >= 0),

    CONSTRAINT chk_resource_availability
        CHECK (
            availability_start IS NULL
            OR availability_end IS NULL
            OR availability_start <= availability_end
        )
);

-- =========================================================
-- 2. MAINTENANCE TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS defects (
    defect_id               VARCHAR(50) PRIMARY KEY,
    asset_id                VARCHAR(50) NOT NULL,
    department              VARCHAR(50),
    section_id              VARCHAR(50) NOT NULL,
    location_code           VARCHAR(50),
    defect_type             VARCHAR(100),
    severity                VARCHAR(50),
    urgency                 VARCHAR(50),
    reported_time           DATE,
    status                  VARCHAR(50),
    target_resolution_time  TIME,
    is_overdue              BOOLEAN,
    repeat_defect           BOOLEAN,
    estimated_impact        NUMERIC(8,3),
    recommended_action      TEXT,

    CONSTRAINT fk_defect_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id),

    CONSTRAINT fk_defect_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id)
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
    task_id                    VARCHAR(50) PRIMARY KEY,
    asset_id                   VARCHAR(50) NOT NULL,
    department                 VARCHAR(50),
    task_type                  VARCHAR(100),
    maintenance_type           VARCHAR(100),
    section_id                 VARCHAR(50) NOT NULL,
    location_code              VARCHAR(50),
    description                TEXT,
    reported_date              DATE,
    due_date                   DATE,
    estimated_duration_min     INTEGER,
    status                     VARCHAR(50),
    criticality                NUMERIC(6,2),
    urgency                    NUMERIC(6,2),
    operational_impact         NUMERIC(6,2),
    can_be_rescheduled         BOOLEAN,
    priority_score             NUMERIC(8,3),
    priority_category          VARCHAR(50),
    required_block_type        VARCHAR(50),
    is_overdue                 BOOLEAN,
    source_defect_id           VARCHAR(50),
    base_priority_score        NUMERIC(8,3),
    priority_source            VARCHAR(100),
    priority_override_reason   TEXT,

    CONSTRAINT fk_task_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id),

    CONSTRAINT fk_task_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT fk_task_source_defect
        FOREIGN KEY (source_defect_id)
        REFERENCES defects(defect_id),

    CONSTRAINT chk_task_duration
        CHECK (
            estimated_duration_min IS NULL
            OR estimated_duration_min >= 0
        ),

    CONSTRAINT chk_task_criticality
        CHECK (criticality IS NULL OR criticality BETWEEN 0 AND 100),

    CONSTRAINT chk_task_urgency
        CHECK (urgency IS NULL OR urgency BETWEEN 0 AND 100),

    CONSTRAINT chk_task_operational_impact
        CHECK (
            operational_impact IS NULL
            OR operational_impact BETWEEN 0 AND 100
        )
);

CREATE TABLE IF NOT EXISTS dependencies (
    dependency_id          VARCHAR(50) PRIMARY KEY,
    predecessor_task_id    VARCHAR(50) NOT NULL,
    successor_task_id      VARCHAR(50) NOT NULL,
    dependency_type        VARCHAR(50),
    minimum_gap_min        INTEGER,
    mandatory              BOOLEAN,

    CONSTRAINT fk_dependency_predecessor
        FOREIGN KEY (predecessor_task_id)
        REFERENCES maintenance_tasks(task_id),

    CONSTRAINT fk_dependency_successor
        FOREIGN KEY (successor_task_id)
        REFERENCES maintenance_tasks(task_id),

    CONSTRAINT chk_dependency_not_self
        CHECK (predecessor_task_id <> successor_task_id),

    CONSTRAINT chk_dependency_gap
        CHECK (minimum_gap_min IS NULL OR minimum_gap_min >= 0)
);

CREATE TABLE IF NOT EXISTS task_resources (
    task_resource_id   VARCHAR(50) PRIMARY KEY,
    task_id            VARCHAR(50) NOT NULL,
    resource_id        VARCHAR(50) NOT NULL,
    requirement_type   VARCHAR(50),
    quantity           INTEGER,
    mandatory          BOOLEAN,
    required_skill     VARCHAR(100),
    role               VARCHAR(100),

    CONSTRAINT fk_task_resource_task
        FOREIGN KEY (task_id)
        REFERENCES maintenance_tasks(task_id),

    CONSTRAINT fk_task_resource_resource
        FOREIGN KEY (resource_id)
        REFERENCES resources(resource_id),

    CONSTRAINT chk_task_resource_quantity
        CHECK (quantity IS NULL OR quantity > 0),

    CONSTRAINT uq_task_resource_assignment
        UNIQUE (task_id, resource_id)
);

-- =========================================================
-- 3. BLOCK PLANNING TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS blocks (
    block_id                 VARCHAR(50) PRIMARY KEY,
    block_name               VARCHAR(150),
    block_type               VARCHAR(50),
    controlling_department   VARCHAR(50),
    start_location_id        VARCHAR(50),
    end_location_id          VARCHAR(50),
    max_duration_min         INTEGER,
    operational_constraints  TEXT,
    status                   VARCHAR(50),

    CONSTRAINT fk_block_start_location
        FOREIGN KEY (start_location_id)
        REFERENCES locations(location_id),

    CONSTRAINT fk_block_end_location
        FOREIGN KEY (end_location_id)
        REFERENCES locations(location_id),

    CONSTRAINT chk_block_duration
        CHECK (
            max_duration_min IS NULL
            OR max_duration_min >= 0
        )
);

CREATE TABLE IF NOT EXISTS block_requirements (
    task_id                         VARCHAR(50) NOT NULL,
    block_id                        VARCHAR(50) NOT NULL,
    required_block_type             VARCHAR(50),
    minimum_block_duration_min      INTEGER,
    setup_duration_min              INTEGER,
    release_duration_min            INTEGER,
    requires_power_isolation        BOOLEAN,
    requires_traffic_block          BOOLEAN,
    requires_signal_block           BOOLEAN,

    PRIMARY KEY (task_id, block_id),

    CONSTRAINT fk_block_requirement_task
        FOREIGN KEY (task_id)
        REFERENCES maintenance_tasks(task_id),

    CONSTRAINT fk_block_requirement_block
        FOREIGN KEY (block_id)
        REFERENCES blocks(block_id),

    CONSTRAINT chk_block_requirement_duration
        CHECK (
            minimum_block_duration_min IS NULL
            OR minimum_block_duration_min >= 0
        ),

    CONSTRAINT chk_block_requirement_setup
        CHECK (
            setup_duration_min IS NULL
            OR setup_duration_min >= 0
        ),

    CONSTRAINT chk_block_requirement_release
        CHECK (
            release_duration_min IS NULL
            OR release_duration_min >= 0
        )
);

CREATE TABLE IF NOT EXISTS block_sections (
    block_section_id   VARCHAR(50) PRIMARY KEY,
    block_id           VARCHAR(50) NOT NULL,
    section_id         VARCHAR(50) NOT NULL,
    sequence_order     INTEGER,

    CONSTRAINT fk_block_section_block
        FOREIGN KEY (block_id)
        REFERENCES blocks(block_id),

    CONSTRAINT fk_block_section_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT chk_block_section_sequence
        CHECK (sequence_order IS NULL OR sequence_order > 0),

    CONSTRAINT uq_block_section_sequence
        UNIQUE (block_id, sequence_order),

    CONSTRAINT uq_block_section_pair
        UNIQUE (block_id, section_id)
);

CREATE TABLE IF NOT EXISTS block_windows (
    window_id       VARCHAR(50) PRIMARY KEY,
    section_id      VARCHAR(50) NOT NULL,
    block_id        VARCHAR(50) NOT NULL,
    start_time      TIMESTAMP NOT NULL,
    end_time        TIMESTAMP NOT NULL,
    duration_min    INTEGER,
    block_type      VARCHAR(50),
    available       BOOLEAN,
    status          VARCHAR(50),
    source          VARCHAR(100),

    CONSTRAINT fk_window_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT fk_window_block
        FOREIGN KEY (block_id)
        REFERENCES blocks(block_id),

    CONSTRAINT chk_window_time
        CHECK (start_time < end_time),

    CONSTRAINT chk_window_duration
        CHECK (duration_min IS NULL OR duration_min >= 0)
);

CREATE TABLE IF NOT EXISTS window_sections (
    window_section_id   VARCHAR(50) PRIMARY KEY,
    window_id           VARCHAR(50) NOT NULL,
    section_id          VARCHAR(50) NOT NULL,

    CONSTRAINT fk_window_section_window
        FOREIGN KEY (window_id)
        REFERENCES block_windows(window_id),

    CONSTRAINT fk_window_section_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT uq_window_section_pair
        UNIQUE (window_id, section_id)
);

-- =========================================================
-- 4. OPERATIONS
-- =========================================================

CREATE TABLE IF NOT EXISTS train_movements (
    movement_id             VARCHAR(50) PRIMARY KEY,
    train_id                VARCHAR(100) NOT NULL,
    train_type              VARCHAR(50),
    section_id              VARCHAR(50) NOT NULL,
    entry_time              TIMESTAMP NOT NULL,
    exit_time               TIMESTAMP NOT NULL,
    direction               VARCHAR(30),
    priority                VARCHAR(50),
    is_freight              BOOLEAN,
    scheduled_or_forecast   VARCHAR(50),
    forecast_confidence     NUMERIC(6,3),
    movement_status         VARCHAR(50),

    CONSTRAINT fk_train_movement_section
        FOREIGN KEY (section_id)
        REFERENCES sections(section_id),

    CONSTRAINT chk_train_movement_time
        CHECK (entry_time < exit_time),

    CONSTRAINT chk_forecast_confidence
        CHECK (
            forecast_confidence IS NULL
            OR forecast_confidence BETWEEN 0 AND 1
        )
);

-- =========================================================
-- 5. COMPATIBILITY RULES
-- =========================================================

CREATE TABLE IF NOT EXISTS compatibility_rules (
    rule_id          VARCHAR(50) PRIMARY KEY,
    rule_name        VARCHAR(150),
    rule_category    VARCHAR(100),
    condition        TEXT,
    applicability    VARCHAR(100),
    result_if_failed VARCHAR(100),
    reason           TEXT
);

-- =========================================================
-- 6. ML / HISTORICAL DATA
-- =========================================================

CREATE TABLE IF NOT EXISTS historical_records (
    record_id                    VARCHAR(50) PRIMARY KEY,
    asset_id                     VARCHAR(50) NOT NULL,
    department                   VARCHAR(50),
    task_type                    VARCHAR(100),
    criticality                  NUMERIC(6,2),
    urgency                      NUMERIC(6,2),
    operational_impact           NUMERIC(6,2),
    previous_defects             INTEGER,
    maintenance_frequency        INTEGER,
    estimated_duration           INTEGER,
    actual_duration              INTEGER,
    delay_to_completion          INTEGER,
    was_overdue                  BOOLEAN,
    repeat_defect                BOOLEAN,
    weather_risk                 NUMERIC(6,3),
    previous_failure_indicator   BOOLEAN,
    defect_severity              VARCHAR(50),
    final_priority               NUMERIC(8,3),

    CONSTRAINT fk_historical_asset
        FOREIGN KEY (asset_id)
        REFERENCES assets(asset_id),

    CONSTRAINT chk_historical_criticality
        CHECK (criticality IS NULL OR criticality BETWEEN 0 AND 100),

    CONSTRAINT chk_historical_urgency
        CHECK (urgency IS NULL OR urgency BETWEEN 0 AND 100),

    CONSTRAINT chk_historical_impact
        CHECK (
            operational_impact IS NULL
            OR operational_impact BETWEEN 0 AND 100
        ),

    CONSTRAINT chk_weather_risk
        CHECK (
            weather_risk IS NULL
            OR weather_risk BETWEEN 0 AND 1
        )
);

-- =========================================================
-- 7. INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_assets_section
    ON assets(section_id);

CREATE INDEX IF NOT EXISTS idx_defects_asset
    ON defects(asset_id);

CREATE INDEX IF NOT EXISTS idx_defects_section
    ON defects(section_id);

CREATE INDEX IF NOT EXISTS idx_tasks_asset
    ON maintenance_tasks(asset_id);

CREATE INDEX IF NOT EXISTS idx_tasks_section
    ON maintenance_tasks(section_id);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date
    ON maintenance_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_priority
    ON maintenance_tasks(priority_score);

CREATE INDEX IF NOT EXISTS idx_task_resources_task
    ON task_resources(task_id);

CREATE INDEX IF NOT EXISTS idx_task_resources_resource
    ON task_resources(resource_id);

CREATE INDEX IF NOT EXISTS idx_block_requirements_task
    ON block_requirements(task_id);

CREATE INDEX IF NOT EXISTS idx_block_requirements_block
    ON block_requirements(block_id);

CREATE INDEX IF NOT EXISTS idx_block_windows_section
    ON block_windows(section_id);

CREATE INDEX IF NOT EXISTS idx_block_windows_time
    ON block_windows(start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_train_movements_section
    ON train_movements(section_id);

CREATE INDEX IF NOT EXISTS idx_train_movements_time
    ON train_movements(entry_time, exit_time);

CREATE INDEX IF NOT EXISTS idx_historical_asset
    ON historical_records(asset_id);

    -- =========================================================
-- 7. PRIORITY PREDICTIONS / AUDIT
-- =========================================================

CREATE TABLE IF NOT EXISTS priority_predictions (
    prediction_id BIGSERIAL PRIMARY KEY,
    run_id        VARCHAR(100) NOT NULL,
    task_id       VARCHAR(50) NOT NULL,
    asset_id      VARCHAR(50),
    calculated_priority_score NUMERIC(8,3) NOT NULL,
    predicted_priority_score  NUMERIC(8,3) NOT NULL,
    final_priority_score      NUMERIC(8,3) NOT NULL,
    model_version VARCHAR(100) NOT NULL DEFAULT 'manas-xgboost-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_priority_prediction_task
        FOREIGN KEY (task_id)
        REFERENCES maintenance_tasks(task_id),

    CONSTRAINT chk_priority_calculated
        CHECK (
            calculated_priority_score BETWEEN 0 AND 100
        ),

    CONSTRAINT chk_priority_predicted
        CHECK (
            predicted_priority_score BETWEEN 0 AND 100
        ),

    CONSTRAINT chk_priority_final
        CHECK (
            final_priority_score BETWEEN 0 AND 100
        )
);

CREATE INDEX IF NOT EXISTS idx_priority_predictions_task
    ON priority_predictions(task_id);

CREATE INDEX IF NOT EXISTS idx_priority_predictions_final_score
    ON priority_predictions(final_priority_score DESC);

CREATE INDEX IF NOT EXISTS idx_priority_predictions_run
    ON priority_predictions(run_id);

CREATE INDEX IF NOT EXISTS idx_priority_predictions_created
    ON priority_predictions(created_at DESC);