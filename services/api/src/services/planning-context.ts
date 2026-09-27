import { pool } from "../config/database.js";

// Shared, data-derived planning context for the dashboard, risk and planner
// read APIs. Everything here is computed from the railopt.* schema; nothing
// is hardcoded demo content.

export type PriorityLevel = "P1" | "P2" | "P3";
export type ImpactLevel = "Low" | "Medium" | "High";

// Tasks that still need planning attention.
export const ACTIVE_TASK_STATUSES = ["PENDING", "SCHEDULED", "IN_PROGRESS"];

// Priority bands match the dataset's own priority_category ranges
// (CRITICAL >= 80, HIGH >= 65, MEDIUM/LOW below).
export function toPriorityLevel(score: number): PriorityLevel {
  if (score >= 80) return "P1";
  if (score >= 65) return "P2";
  return "P3";
}

// Train-impact band for a block window, from the number of train movements
// on the same section that overlap the window in time.
export function toImpactLevel(overlappingTrains: number): ImpactLevel {
  if (overlappingTrains >= 7) return "High";
  if (overlappingTrains >= 3) return "Medium";
  return "Low";
}

export function toConditionLabel(conditionScore: number | null): string {
  if (conditionScore === null) return "Unknown";
  if (conditionScore >= 75) return "Good";
  if (conditionScore >= 55) return "Fair";
  return "Poor";
}

export function titleCase(value: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} Hrs`;
}

export function formatClock(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export function formatDateLabel(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * The planning date drives the planner horizon and the overdue calculation.
 * Defaults to the first day that has block windows; override with
 * PLANNING_DATE=YYYY-MM-DD.
 */
export async function getPlanningDate(): Promise<string> {
  const override = process.env.PLANNING_DATE;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;

  const result = await pool.query<{ planning_date: string | null }>(
    `SELECT to_char(MIN(start_time), 'YYYY-MM-DD') AS planning_date
     FROM railopt.block_windows`,
  );
  const planningDate = result.rows[0]?.planning_date;
  if (!planningDate) {
    throw new Error("No block windows are available to derive a planning date");
  }
  return planningDate;
}

export type SectionInfo = {
  sectionId: string;
  label: string;
  fromStation: string;
  toStation: string;
};

export async function getSections(): Promise<SectionInfo[]> {
  const result = await pool.query<{
    section_id: string;
    from_station: string;
    to_station: string;
  }>(
    `SELECT s.section_id,
            COALESCE(fl.station_code, s.from_location_id) AS from_station,
            COALESCE(tl.station_code, s.to_location_id) AS to_station
     FROM railopt.sections s
     LEFT JOIN railopt.locations fl ON fl.location_id = s.from_location_id
     LEFT JOIN railopt.locations tl ON tl.location_id = s.to_location_id
     ORDER BY s.section_id`,
  );

  return result.rows.map((row) => ({
    sectionId: row.section_id,
    label: `${row.from_station} – ${row.to_station}`,
    fromStation: row.from_station,
    toStation: row.to_station,
  }));
}

/**
 * OVERRIDE: an authorized planner's manual priority (dataset priority_source
 * MANUAL_OVERRIDE, with a reason) takes precedence over the model.
 * ML: latest final_priority_score from POST /api/priority/predict.
 * DATASET: dataset priority_score when no ML run exists yet.
 */
export type PriorityScoreSource = "OVERRIDE" | "ML" | "DATASET";

export type ActiveTask = {
  taskId: string;
  assetId: string;
  department: string;
  taskType: string;
  assetType: string | null;
  sectionId: string;
  status: string;
  dueDate: string | null;
  criticality: number;
  urgency: number;
  operationalImpact: number;
  conditionScore: number | null;
  assetCriticality: number | null;
  openDefects: number;
  priorityScore: number;
  scoreSource: PriorityScoreSource;
  overrideReason: string | null;
  overdueDays: number;
};

/**
 * Active maintenance tasks ranked by priority. Uses the latest ML final
 * priority score when POST /api/priority/predict has been run, otherwise the
 * dataset's priority_score.
 */
export async function getActiveTasks(planningDate: string): Promise<ActiveTask[]> {
  const result = await pool.query<{
    task_id: string;
    asset_id: string;
    department: string;
    task_type: string;
    asset_type: string | null;
    section_id: string;
    status: string;
    due_date: string | null;
    criticality: string | null;
    urgency: string | null;
    operational_impact: string | null;
    condition_score: string | null;
    asset_criticality: string | null;
    open_defects: string;
    ml_score: string | null;
    dataset_score: string | null;
    priority_source: string | null;
    priority_override_reason: string | null;
    overdue_days: number;
  }>(
    `SELECT t.task_id,
            t.asset_id,
            t.department,
            t.task_type,
            a.asset_type,
            t.section_id,
            t.status,
            to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
            t.criticality,
            t.urgency,
            t.operational_impact,
            a.condition_score,
            a.criticality AS asset_criticality,
            (SELECT COUNT(*) FROM railopt.defects d
              WHERE d.asset_id = t.asset_id AND d.status <> 'RESOLVED') AS open_defects,
            pp.final_priority_score AS ml_score,
            t.priority_score AS dataset_score,
            t.priority_source,
            t.priority_override_reason,
            GREATEST(0, $1::date - t.due_date) AS overdue_days
     FROM railopt.maintenance_tasks t
     LEFT JOIN railopt.assets a ON a.asset_id = t.asset_id
     LEFT JOIN LATERAL (
       SELECT final_priority_score
       FROM railopt.priority_predictions
       WHERE task_id = t.task_id
       ORDER BY created_at DESC
       LIMIT 1
     ) pp ON TRUE
     WHERE t.status = ANY($2)
     ORDER BY CASE WHEN t.priority_source = 'MANUAL_OVERRIDE' THEN t.priority_score
                   ELSE COALESCE(pp.final_priority_score, t.priority_score, 0) END DESC,
              t.due_date ASC NULLS LAST,
              t.task_id`,
    [planningDate, ACTIVE_TASK_STATUSES],
  );

  return result.rows.map((row) => ({
    taskId: row.task_id,
    assetId: row.asset_id,
    department: row.department,
    taskType: row.task_type,
    assetType: row.asset_type,
    sectionId: row.section_id,
    status: row.status,
    dueDate: row.due_date,
    criticality: Number(row.criticality ?? 0),
    urgency: Number(row.urgency ?? 0),
    operationalImpact: Number(row.operational_impact ?? 0),
    conditionScore: row.condition_score === null ? null : Number(row.condition_score),
    assetCriticality:
      row.asset_criticality === null ? null : Number(row.asset_criticality),
    openDefects: Number(row.open_defects),
    ...resolvePriority(row),
    overdueDays: Number(row.overdue_days ?? 0),
  }));
}

function resolvePriority(row: {
  ml_score: string | null;
  dataset_score: string | null;
  priority_source: string | null;
  priority_override_reason: string | null;
}): Pick<ActiveTask, "priorityScore" | "scoreSource" | "overrideReason"> {
  if (row.priority_source === "MANUAL_OVERRIDE" && row.dataset_score !== null) {
    return {
      priorityScore: Math.round(Number(row.dataset_score)),
      scoreSource: "OVERRIDE",
      overrideReason: row.priority_override_reason,
    };
  }
  return {
    priorityScore: Math.round(Number(row.ml_score ?? row.dataset_score ?? 0)),
    scoreSource: row.ml_score === null ? "DATASET" : "ML",
    overrideReason: null,
  };
}

export function describeTask(task: Pick<ActiveTask, "taskType" | "assetType">): string {
  const assetType = titleCase(task.assetType);
  return assetType
    ? `${titleCase(task.taskType)} – ${assetType}`
    : titleCase(task.taskType);
}

export type WindowSummary = {
  windowId: string;
  blockId: string;
  sectionId: string;
  blockType: string;
  start: Date;
  end: Date;
  durationMin: number;
  available: boolean;
  status: string;
  overlappingTrains: number;
  impact: ImpactLevel;
  candidateTaskIds: string[];
  tooLongTaskIds: string[];
  topCandidateScore: number | null;
};

/**
 * Block windows starting on the planning date, with the train movements that
 * overlap each window. A task is a candidate for a window when its block
 * requirement points at the window's block, the block type matches (a
 * COMBINED_BLOCK window serves any type), and its
 * minimum block duration plus setup and release time fits in the window.
 * Candidates are pre-optimization: nothing here is a scheduled assignment.
 */
export async function getWindowsForDate(
  planningDate: string,
  tasks: ActiveTask[],
): Promise<WindowSummary[]> {
  const result = await pool.query<{
    window_id: string;
    block_id: string;
    section_id: string;
    block_type: string;
    start_time: Date;
    end_time: Date;
    duration_min: number;
    available: boolean;
    status: string;
    overlapping_trains: string;
    candidate_task_ids: string[] | null;
    too_long_task_ids: string[] | null;
  }>(
    `SELECT bw.window_id,
            bw.block_id,
            bw.section_id,
            bw.block_type,
            bw.start_time,
            bw.end_time,
            bw.duration_min,
            bw.available,
            bw.status,
            (SELECT COUNT(*) FROM railopt.train_movements tm
              WHERE tm.section_id = bw.section_id
                AND tm.entry_time < bw.end_time
                AND tm.exit_time > bw.start_time) AS overlapping_trains,
            (SELECT array_agg(DISTINCT br.task_id)
              FROM railopt.block_requirements br
              WHERE br.block_id = bw.block_id
                AND (br.required_block_type = bw.block_type
                     OR bw.block_type = 'COMBINED_BLOCK')
                AND COALESCE(br.minimum_block_duration_min, 0)
                    + COALESCE(br.setup_duration_min, 0)
                    + COALESCE(br.release_duration_min, 0) <= bw.duration_min
            ) AS candidate_task_ids,
            (SELECT array_agg(DISTINCT br.task_id)
              FROM railopt.block_requirements br
              WHERE br.block_id = bw.block_id
                AND COALESCE(br.minimum_block_duration_min, 0)
                    + COALESCE(br.setup_duration_min, 0)
                    + COALESCE(br.release_duration_min, 0) > bw.duration_min
            ) AS too_long_task_ids
     FROM railopt.block_windows bw
     WHERE bw.start_time >= $1::date
       AND bw.start_time < $1::date + 1
     ORDER BY bw.section_id, bw.start_time, bw.window_id`,
    [planningDate],
  );

  const activeScores = new Map(tasks.map((task) => [task.taskId, task.priorityScore]));

  return result.rows.map((row) => {
    const candidateTaskIds = (row.candidate_task_ids ?? []).filter((taskId) =>
      activeScores.has(taskId),
    );
    const tooLongTaskIds = (row.too_long_task_ids ?? []).filter((taskId) =>
      activeScores.has(taskId),
    );
    const scores = candidateTaskIds.map((taskId) => activeScores.get(taskId) ?? 0);
    const overlappingTrains = Number(row.overlapping_trains);

    return {
      windowId: row.window_id,
      blockId: row.block_id,
      sectionId: row.section_id,
      blockType: row.block_type,
      start: row.start_time,
      end: row.end_time,
      durationMin: Number(row.duration_min),
      available: row.available,
      status: row.status,
      overlappingTrains,
      impact: toImpactLevel(overlappingTrains),
      candidateTaskIds,
      tooLongTaskIds,
      topCandidateScore: scores.length ? Math.max(...scores) : null,
    };
  });
}

export function toPriorityCoverage(
  topCandidateScore: number | null,
): "High" | "Medium" | "Low" {
  if (topCandidateScore === null) return "Low";
  const level = toPriorityLevel(topCandidateScore);
  return level === "P1" ? "High" : level === "P2" ? "Medium" : "Low";
}

/**
 * Pre-optimization pick: the available window with the most active candidate
 * tasks, preferring fewer overlapping trains. This is a ranking rule, not a
 * CP-SAT result.
 */
export function pickTopCandidateWindow(
  windows: WindowSummary[],
): WindowSummary | undefined {
  return [...windows]
    .filter((window) => window.available)
    .sort(
      (a, b) =>
        b.candidateTaskIds.length - a.candidateTaskIds.length ||
        a.overlappingTrains - b.overlappingTrains ||
        a.start.getTime() - b.start.getTime(),
    )[0];
}

export function describeWindowReason(window: WindowSummary): string {
  const parts = [
    `${window.candidateTaskIds.length} active task(s) fit this ${window.blockId} window`,
    `${window.overlappingTrains} train movement(s) overlap it`,
  ];
  if (window.tooLongTaskIds.length) {
    parts.push(
      `${window.tooLongTaskIds.length} task(s) rejected: need a longer window`,
    );
  }
  if (!window.available) parts.unshift(`Window is ${window.status.toLowerCase()}`);
  return parts.join("; ");
}
