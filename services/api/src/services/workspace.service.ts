import fs from "node:fs";
import path from "node:path";

import { parse } from "csv-parse/sync";

import { pool } from "../config/database.js";
import { config } from "../config/env.js";
import { SOLVER_TIME_LIMIT_SECONDS } from "./block-plan.service.js";
import { DATASET_FILES, DATASET_ROOT } from "../database/dataset-files.js";
import {
  describeTask,
  getActiveTasks,
  getPlanningDate,
  toImpactLevel,
  toPriorityLevel,
} from "./planning-context.js";

const HORIZON_DAYS = Number(process.env.PLANNING_HORIZON_DAYS) || 7;

/** Active maintenance backlog (PENDING / SCHEDULED / IN_PROGRESS) with status counts. */
export async function getBacklog() {
  const planningDate = await getPlanningDate();
  const [tasks, statusCounts] = await Promise.all([
    getActiveTasks(planningDate),
    pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) AS count FROM railopt.maintenance_tasks
       GROUP BY status ORDER BY status`,
    ),
  ]);

  return {
    planningDate,
    statusCounts: Object.fromEntries(
      statusCounts.rows.map((row) => [row.status, Number(row.count)]),
    ),
    tasks: tasks.map((task) => ({
      taskId: task.taskId,
      assetId: task.assetId,
      task: describeTask(task),
      taskType: task.taskType,
      department: task.department,
      sectionId: task.sectionId,
      status: task.status,
      dueDate: task.dueDate,
      overdueDays: task.overdueDays,
      priorityScore: task.priorityScore,
      priority: toPriorityLevel(task.priorityScore),
      scoreSource: task.scoreSource,
      overrideReason: task.overrideReason,
      openDefects: task.openDefects,
    })),
  };
}

/** Every block window in the planning horizon with its sections and train load. */
export async function getBlockWindows() {
  const planningDate = await getPlanningDate();
  const result = await pool.query<{
    window_id: string;
    block_id: string;
    block_type: string;
    section_id: string;
    sections: string[];
    start_time: string;
    end_time: string;
    duration_min: number;
    available: boolean;
    status: string;
    overlapping_trains: string;
    overlapping_freight: string;
    pending_tasks: string;
  }>(
    `SELECT bw.window_id, bw.block_id, bw.block_type, bw.section_id,
            COALESCE(
              (SELECT array_agg(ws.section_id ORDER BY ws.section_id)
                 FROM railopt.window_sections ws WHERE ws.window_id = bw.window_id),
              ARRAY[bw.section_id]
            ) AS sections,
            to_char(bw.start_time, 'YYYY-MM-DD HH24:MI') AS start_time,
            to_char(bw.end_time, 'YYYY-MM-DD HH24:MI') AS end_time,
            bw.duration_min, bw.available, bw.status,
            (SELECT COUNT(*) FROM railopt.train_movements tm
              WHERE tm.section_id = bw.section_id
                AND tm.entry_time < bw.end_time
                AND tm.exit_time > bw.start_time) AS overlapping_trains,
            (SELECT COUNT(*) FROM railopt.train_movements tm
              WHERE tm.section_id = bw.section_id AND tm.is_freight
                AND tm.entry_time < bw.end_time
                AND tm.exit_time > bw.start_time) AS overlapping_freight,
            (SELECT COUNT(*) FROM railopt.maintenance_tasks t
              WHERE t.status = 'PENDING'
                AND t.section_id IN (
                  SELECT ws.section_id FROM railopt.window_sections ws
                   WHERE ws.window_id = bw.window_id
                  UNION SELECT bw.section_id)) AS pending_tasks
     FROM railopt.block_windows bw
     WHERE bw.start_time >= $1::date AND bw.start_time < $1::date + $2::int
     ORDER BY bw.start_time, bw.window_id`,
    [planningDate, HORIZON_DAYS],
  );

  return {
    planningDate,
    horizonDays: HORIZON_DAYS,
    windows: result.rows.map((row) => ({
      windowId: row.window_id,
      blockId: row.block_id,
      blockType: row.block_type,
      sectionId: row.section_id,
      sections: row.sections,
      start: row.start_time,
      end: row.end_time,
      durationMin: row.duration_min,
      available: row.available,
      status: row.status,
      overlappingTrains: Number(row.overlapping_trains),
      overlappingFreight: Number(row.overlapping_freight),
      impact: toImpactLevel(Number(row.overlapping_trains)),
      pendingTasks: Number(row.pending_tasks),
    })),
  };
}

function countCsvRows(file: string): number | null {
  const filePath = path.join(DATASET_ROOT, file);
  if (!fs.existsSync(filePath)) return null;
  const records: unknown[] = parse(fs.readFileSync(filePath, "utf8"), {
    columns: true,
    skip_empty_lines: true,
  });
  return records.length;
}

/**
 * Where RAILOPT data comes from today: the synthetic CSV files, loaded into
 * PostgreSQL by the importer. Row counts are compared file vs table.
 */
export async function getDataSources() {
  const sources = await Promise.all(
    DATASET_FILES.map(async ({ file, table }) => {
      const tableRows = await pool
        .query<{ count: string }>(`SELECT COUNT(*) AS count FROM railopt.${table}`)
        .then((result) => Number(result.rows[0]?.count ?? 0));
      const csvRows = countCsvRows(file);
      return { file, table, csvRows, tableRows, inSync: csvRows === tableRows };
    }),
  );
  const predictions = await pool.query<{ runs: string; rows: string; latest: string | null }>(
    `SELECT COUNT(DISTINCT run_id) AS runs, COUNT(*) AS rows,
            to_char(MAX(created_at), 'YYYY-MM-DD HH24:MI') AS latest
     FROM railopt.priority_predictions`,
  );
  const prediction = predictions.rows[0];
  return {
    datasetRoot: "data/railopt_raw",
    sources,
    priorityPredictions: {
      runs: Number(prediction?.runs ?? 0),
      rows: Number(prediction?.rows ?? 0),
      latest: prediction?.latest ?? null,
    },
  };
}

type QualityCheck = {
  id: string;
  category: string;
  description: string;
  sql: string;
  // Failing rows make the check FAIL, or only WARN for informational checks.
  severity: "FAIL" | "WARN";
};

const QUALITY_CHECKS: QualityCheck[] = [
  {
    id: "TASK_ASSET_FK",
    category: "Referential",
    description: "Tasks that reference an unknown asset",
    sql: `SELECT COUNT(*) FROM railopt.maintenance_tasks t
          LEFT JOIN railopt.assets a ON a.asset_id = t.asset_id
          WHERE t.asset_id IS NOT NULL AND a.asset_id IS NULL`,
    severity: "FAIL",
  },
  {
    id: "TASK_SECTION_FK",
    category: "Referential",
    description: "Tasks that reference an unknown section",
    sql: `SELECT COUNT(*) FROM railopt.maintenance_tasks t
          LEFT JOIN railopt.sections s ON s.section_id = t.section_id
          WHERE t.section_id IS NOT NULL AND s.section_id IS NULL`,
    severity: "FAIL",
  },
  {
    id: "DEPENDENCY_TASK_FK",
    category: "Referential",
    description: "Dependencies whose predecessor or successor task does not exist",
    sql: `SELECT COUNT(*) FROM railopt.dependencies d
          WHERE NOT EXISTS (SELECT 1 FROM railopt.maintenance_tasks t WHERE t.task_id = d.predecessor_task_id)
             OR NOT EXISTS (SELECT 1 FROM railopt.maintenance_tasks t WHERE t.task_id = d.successor_task_id)`,
    severity: "FAIL",
  },
  {
    id: "DEPENDENCY_SELF",
    category: "Consistency",
    description: "Tasks that depend on themselves",
    sql: `SELECT COUNT(*) FROM railopt.dependencies WHERE predecessor_task_id = successor_task_id`,
    severity: "FAIL",
  },
  {
    id: "TASK_RESOURCE_FK",
    category: "Referential",
    description: "Task resource needs that reference an unknown resource",
    sql: `SELECT COUNT(*) FROM railopt.task_resources tr
          LEFT JOIN railopt.resources r ON r.resource_id = tr.resource_id
          WHERE r.resource_id IS NULL`,
    severity: "FAIL",
  },
  {
    id: "TRAIN_SECTION_FK",
    category: "Referential",
    description: "Train movements on an unknown section",
    sql: `SELECT COUNT(*) FROM railopt.train_movements tm
          LEFT JOIN railopt.sections s ON s.section_id = tm.section_id
          WHERE s.section_id IS NULL`,
    severity: "FAIL",
  },
  {
    id: "WINDOW_TIME_ORDER",
    category: "Temporal",
    description: "Block windows that end before they start",
    sql: `SELECT COUNT(*) FROM railopt.block_windows WHERE end_time <= start_time`,
    severity: "FAIL",
  },
  {
    id: "WINDOW_DURATION",
    category: "Consistency",
    description: "Block windows whose duration_min differs from end − start",
    sql: `SELECT COUNT(*) FROM railopt.block_windows
          WHERE duration_min <> EXTRACT(EPOCH FROM (end_time - start_time)) / 60`,
    severity: "FAIL",
  },
  {
    id: "TRAIN_TIME_ORDER",
    category: "Temporal",
    description: "Train movements that exit before they enter",
    sql: `SELECT COUNT(*) FROM railopt.train_movements WHERE exit_time <= entry_time`,
    severity: "FAIL",
  },
  {
    id: "RESOURCE_AVAILABILITY",
    category: "Temporal",
    description: "Resources whose availability ends before it starts",
    sql: `SELECT COUNT(*) FROM railopt.resources
          WHERE availability_end IS NOT NULL AND availability_start IS NOT NULL
            AND availability_end <= availability_start`,
    severity: "FAIL",
  },
  {
    id: "TASK_DUE_ORDER",
    category: "Temporal",
    description: "Tasks due before they were reported",
    sql: `SELECT COUNT(*) FROM railopt.maintenance_tasks
          WHERE due_date IS NOT NULL AND reported_date IS NOT NULL AND due_date < reported_date`,
    severity: "FAIL",
  },
  {
    id: "TASK_DURATION",
    category: "Completeness",
    description: "Tasks with a missing or non-positive estimated duration",
    sql: `SELECT COUNT(*) FROM railopt.maintenance_tasks
          WHERE estimated_duration_min IS NULL OR estimated_duration_min <= 0`,
    severity: "FAIL",
  },
  {
    id: "PENDING_BLOCK_REQUIREMENT",
    category: "Completeness",
    description: "PENDING tasks without a block requirement (cannot be planned)",
    sql: `SELECT COUNT(*) FROM railopt.maintenance_tasks t
          WHERE t.status = 'PENDING'
            AND NOT EXISTS (SELECT 1 FROM railopt.block_requirements br WHERE br.task_id = t.task_id)`,
    severity: "WARN",
  },
  {
    id: "ASSET_CONDITION_RANGE",
    category: "Range",
    description: "Assets with condition_score outside 0–100",
    sql: `SELECT COUNT(*) FROM railopt.assets
          WHERE condition_score IS NOT NULL AND (condition_score < 0 OR condition_score > 100)`,
    severity: "FAIL",
  },
  {
    id: "LOCATION_COORDINATES",
    category: "Completeness",
    description: "Locations without coordinates (not drawn on the map)",
    sql: `SELECT COUNT(*) FROM railopt.locations WHERE latitude IS NULL OR longitude IS NULL`,
    severity: "WARN",
  },
  {
    id: "PENDING_OVERDUE",
    category: "Operational",
    description: "PENDING tasks already past their due date on the planning date",
    sql: `SELECT COUNT(*) FROM railopt.maintenance_tasks
          WHERE status = 'PENDING' AND due_date < $1::date`,
    severity: "WARN",
  },
];

/** Integrity checks run live against the railopt.* tables. */
export async function getDataQuality() {
  const planningDate = await getPlanningDate();
  const checks = await Promise.all(
    QUALITY_CHECKS.map(async (check) => {
      const params = check.sql.includes("$1") ? [planningDate] : [];
      const result = await pool.query<{ count: string }>(check.sql, params);
      const failing = Number(result.rows[0]?.count ?? 0);
      return {
        id: check.id,
        category: check.category,
        description: check.description,
        failing,
        status: failing === 0 ? "PASS" : check.severity,
      };
    }),
  );
  // CSV rows that did not land in PostgreSQL (the importer skips rows that
  // violate a key or UNIQUE constraint).
  const { sources } = await getDataSources();
  const skipped = sources.filter((source) => source.csvRows !== null && source.csvRows !== source.tableRows);
  checks.push({
    id: "IMPORT_ROW_COUNT",
    category: "Import",
    description:
      skipped.length === 0
        ? "Every CSV row is present in its PostgreSQL table"
        : `CSV rows not in PostgreSQL (skipped on import): ${skipped
            .map((source) => `${source.file} ${source.csvRows} → ${source.tableRows}`)
            .join(", ")}`,
    failing: skipped.reduce((sum, source) => sum + Math.abs((source.csvRows ?? 0) - source.tableRows), 0),
    status: skipped.length === 0 ? "PASS" : "WARN",
  });
  return { planningDate, checks };
}

async function probe(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Effective planning settings and service health (read-only). */
export async function getSettings() {
  const [planningDate, ml, optimizer, model] = await Promise.all([
    getPlanningDate(),
    probe(config.mlServiceUrl),
    probe(config.optimizerServiceUrl),
    fetch(`${config.mlServiceUrl.replace(/\/$/, "")}/priority/model`, {
      signal: AbortSignal.timeout(2000),
    })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null),
  ]);
  return {
    planningDate,
    planningDateSource: process.env.PLANNING_DATE ? "PLANNING_DATE env" : "first block-window day",
    horizonDays: HORIZON_DAYS,
    priorityBands: { P1: ">= 80", P2: "65 – 79", P3: "< 65" },
    trainImpactBands: { High: ">= 7 trains", Medium: "3 – 6 trains", Low: "< 3 trains" },
    solver: { engine: "OR-Tools CP-SAT", timeLimitSeconds: SOLVER_TIME_LIMIT_SECONDS, whatIfMode: "deterministic (1 worker, seed 0)" },
    services: [
      { name: "Node API", url: `http://localhost:${config.port}`, up: true },
      { name: "ML priority service", url: config.mlServiceUrl, up: ml },
      { name: "Optimizer (CP-SAT)", url: config.optimizerServiceUrl, up: optimizer },
    ],
    model,
  };
}
