import { pool } from "../config/database.js";
import { config } from "../config/env.js";
import { postJson } from "../integrations/python-service.client.js";
import type { BlockPlanResponse } from "../types/python-services.js";
import { getActiveTasks, getPlanningDate, PRIORITY_BANDS } from "./planning-context.js";
import { generatePriorityScores } from "./priority.service.js";

export type PrioritySource = {
  source: "ML" | "DATASET";
  run_id: string | null;
  model_version: string | null;
  note: string | null;
};

/**
 * Score every task with the ML priority model first, so CP-SAT plans with
 * fresh ML priorities. If the ML service is unavailable the planner falls
 * back to the dataset priority_score and says so in the response.
 */
async function scorePriorities(): Promise<PrioritySource> {
  try {
    const prediction = await generatePriorityScores();
    return {
      source: "ML",
      run_id: prediction.run_id,
      model_version: prediction.model_version,
      note: null,
    };
  } catch (error) {
    console.error("ML priority scoring failed; using stored priorities:", error);
    return storedPriority("ML service unavailable; using the previous ML run from");
  }
}

/**
 * The priorities planning reads without a new ML run: the latest stored ML
 * run (planner overrides still win), or the dataset score if none exists.
 */
export async function storedPriority(notePrefix: string): Promise<PrioritySource> {
  const previous = await pool.query<{
    run_id: string;
    model_version: string;
    created: string;
  }>(
    `SELECT run_id, model_version,
            to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created
     FROM railopt.priority_predictions
     ORDER BY created_at DESC
     LIMIT 1`,
  );
  const run = previous.rows[0];
  return run
    ? {
        source: "ML",
        run_id: run.run_id,
        model_version: run.model_version,
        note: `${notePrefix} ${run.created}`,
      }
    : {
        source: "DATASET",
        run_id: null,
        model_version: null,
        note: `${notePrefix.split(";")[0]}; no ML run stored, dataset priority_score used`,
      };
}

const DEFAULT_HORIZON_DAYS = 7;
export const SOLVER_TIME_LIMIT_SECONDS = 20;

export type PlanningPayload = Record<string, unknown> & {
  horizon_start: string;
  horizon_days: number;
  time_limit_seconds: number;
};

/**
 * Planning input for the optimizer, built from the railopt.* tables with the
 * current priorities (planner override, else latest ML score, else dataset).
 * Only PENDING tasks are planned; SCHEDULED and IN_PROGRESS work is treated
 * as already committed.
 */
export async function buildPlanningPayload(): Promise<PlanningPayload> {
  const planningDate = await getPlanningDate();
  const horizonDays = Number(process.env.PLANNING_HORIZON_DAYS) || DEFAULT_HORIZON_DAYS;

  const pendingTasks = (await getActiveTasks(planningDate)).filter(
    (task) => task.status === "PENDING",
  );
  const taskIds = pendingTasks.map((task) => task.taskId);

  const range = [planningDate, horizonDays];
  const [
    windows,
    requirements,
    resources,
    taskResources,
    dependencies,
    trains,
    sections,
    blocks,
  ] = await Promise.all([
      pool.query(
        `SELECT bw.window_id, bw.block_id, bw.block_type, bw.section_id,
                to_char(bw.start_time, 'YYYY-MM-DD HH24:MI:SS') AS start_time,
                to_char(bw.end_time, 'YYYY-MM-DD HH24:MI:SS') AS end_time,
                bw.available, bw.status,
                COALESCE(
                  (SELECT array_agg(ws.section_id ORDER BY ws.section_id)
                     FROM railopt.window_sections ws WHERE ws.window_id = bw.window_id),
                  ARRAY[bw.section_id]
                ) AS sections
         FROM railopt.block_windows bw
         WHERE bw.start_time >= $1::date AND bw.start_time < $1::date + $2::int`,
        range,
      ),
      pool.query(
        `SELECT task_id, block_id, required_block_type, minimum_block_duration_min,
                setup_duration_min, release_duration_min
         FROM railopt.block_requirements WHERE task_id = ANY($1)`,
        [taskIds],
      ),
      pool.query(
        `SELECT resource_id, capacity, status, department, skills,
                to_char(availability_start, 'YYYY-MM-DD HH24:MI:SS') AS availability_start,
                to_char(availability_end, 'YYYY-MM-DD HH24:MI:SS') AS availability_end
         FROM railopt.resources`,
      ),
      pool.query(
        `SELECT task_id, resource_id, quantity, mandatory, required_skill
         FROM railopt.task_resources WHERE task_id = ANY($1)`,
        [taskIds],
      ),
      pool.query(
        `SELECT predecessor_task_id, successor_task_id, minimum_gap_min, mandatory
         FROM railopt.dependencies WHERE successor_task_id = ANY($1)`,
        [taskIds],
      ),
      pool.query(
        `SELECT movement_id, section_id,
                to_char(entry_time, 'YYYY-MM-DD HH24:MI:SS') AS entry_time,
                to_char(exit_time, 'YYYY-MM-DD HH24:MI:SS') AS exit_time
         FROM railopt.train_movements
         WHERE exit_time > $1::date AND entry_time < $1::date + $2::int`,
        range,
      ),
      pool.query(
        `SELECT section_id, electrified, operational_status FROM railopt.sections`,
      ),
      pool.query(`SELECT block_id, max_duration_min FROM railopt.blocks`),
    ]);

  return {
      horizon_start: planningDate,
      horizon_days: horizonDays,
      time_limit_seconds: SOLVER_TIME_LIMIT_SECONDS,
      p1_threshold: PRIORITY_BANDS.P1,
      tasks: pendingTasks.map((task) => ({
        task_id: task.taskId,
        section_id: task.sectionId,
        department: task.department,
        priority_score: task.priorityScore,
        asset_id: task.assetId,
        task_type: task.taskType,
        due_date: task.dueDate,
      })),
      windows: windows.rows,
      requirements: requirements.rows,
      resources: resources.rows,
      task_resources: taskResources.rows,
      dependencies: dependencies.rows,
      trains: trains.rows,
      sections: sections.rows,
      blocks: blocks.rows,
  };
}

/**
 * ML priority -> CP-SAT plan: score every task with the ML model, then ask
 * the optimizer's CP-SAT block planner for a plan with those priorities.
 */
export async function generateBlockPlan(): Promise<
  BlockPlanResponse & {
    planning_date: string;
    horizon_days: number;
    priority: PrioritySource;
  }
> {
  const priority = await scorePriorities();
  const payload = await buildPlanningPayload();

  const result = await postJson<unknown, BlockPlanResponse>(
    config.optimizerServiceUrl,
    "/plan-blocks",
    // Also solve the earlier one-task-per-section model for comparison.
    { ...payload, compare_modes: true, include_details: true },
    // Two solves (coordinated + comparison) plus transfer.
    (2 * SOLVER_TIME_LIMIT_SECONDS + 30) * 1000,
  );

  return {
    ...result,
    planning_date: payload.horizon_start,
    horizon_days: payload.horizon_days,
    priority,
  };
}

export type WhatIfChange = {
  type: string;
  window_id?: string;
  resource_id?: string;
  task_id?: string;
  section_id?: string;
  minutes?: number;
  priority_score?: number;
  start_time?: string;
  end_time?: string;
};

/**
 * What-if: solve the current planning input and a changed copy, both
 * deterministically, and return the difference. Uses the stored priorities
 * (no new ML run) so only the listed changes differ.
 */
export async function runWhatIf(changes: WhatIfChange[]): Promise<unknown> {
  const payload = await buildPlanningPayload();
  return postJson<unknown, unknown>(
    config.optimizerServiceUrl,
    "/what-if",
    { planning: payload, changes },
    (2 * SOLVER_TIME_LIMIT_SECONDS + 30) * 1000,
  );
}

type PayloadRow = Record<string, unknown>;

/** Choices for the what-if form, from the same planning input. */
export async function getWhatIfOptions(): Promise<unknown> {
  const payload = await buildPlanningPayload();
  const rows = (key: string) => (payload[key] as PayloadRow[]) ?? [];
  return {
    planning_date: payload.horizon_start,
    horizon_days: payload.horizon_days,
    windows: rows("windows").map((window) => ({
      window_id: window.window_id,
      block_type: window.block_type,
      sections: window.sections,
      start_time: window.start_time,
      end_time: window.end_time,
      available: window.available,
    })),
    resources: rows("resources").map((resource) => ({
      resource_id: resource.resource_id,
      department: resource.department,
      skills: resource.skills,
      status: resource.status,
    })),
    tasks: rows("tasks").map((task) => ({
      task_id: task.task_id,
      section_id: task.section_id,
      department: task.department,
      priority_score: task.priority_score,
    })),
    sections: rows("sections").map((section) => section.section_id),
  };
}

export type PreviousAssignment = {
  task_id: string;
  window_id: string;
  section_id: string;
  start: string;
  end: string;
  start_minute: number;
  end_minute: number;
  priority_score: number;
};

/**
 * Re-optimise a stored plan against the current inputs: apply the changes
 * (disruption or planner edits), freeze work started before freezeBefore,
 * honour pins, and stay close to the previous plan elsewhere.
 */
export async function replanFrom(options: {
  previous: PreviousAssignment[];
  changes: WhatIfChange[];
  freezeBefore: string | null;
  pins: Record<string, string>;
}): Promise<Record<string, unknown>> {
  const payload = await buildPlanningPayload();
  const result = await postJson<unknown, Record<string, unknown>>(
    config.optimizerServiceUrl,
    "/replan",
    {
      planning: { ...payload, include_details: true },
      previous: options.previous,
      changes: options.changes,
      freeze_before: options.freezeBefore,
      pins: options.pins,
    },
    (SOLVER_TIME_LIMIT_SECONDS + 30) * 1000,
  );
  return {
    ...result,
    planning_date: payload.horizon_start,
    horizon_days: payload.horizon_days,
    priority: await storedPriority("Stored priorities (no new ML run); latest ML run from"),
  };
}

export const DEFAULT_MONTH_WEEKS = Number(process.env.MONTHLY_PLAN_WEEKS) || 5;

/**
 * Monthly rough-cut plan: ML priority first (as for the weekly plan), then
 * CP-SAT assigns pending tasks to weeks. Week 1 uses the dataset's windows;
 * later weeks repeat that pattern (projected, see the optimizer).
 */
export async function generateMonthlyPlan(weeks = DEFAULT_MONTH_WEEKS): Promise<Record<string, unknown>> {
  const priority = await scorePriorities();
  const payload = await buildPlanningPayload();
  const result = await postJson<unknown, Record<string, unknown>>(
    config.optimizerServiceUrl,
    "/plan-month",
    { planning: { ...payload, horizon_days: 7 }, weeks },
    (SOLVER_TIME_LIMIT_SECONDS + 30) * 1000,
  );
  return { ...result, planning_date: payload.horizon_start, horizon_days: weeks * 7, priority };
}
