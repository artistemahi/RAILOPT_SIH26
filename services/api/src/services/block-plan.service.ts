import { pool } from "../config/database.js";
import { config } from "../config/env.js";
import { postJson } from "../integrations/python-service.client.js";
import type { BlockPlanResponse } from "../types/python-services.js";
import { getActiveTasks, getPlanningDate } from "./planning-context.js";

const DEFAULT_HORIZON_DAYS = 7;
const SOLVER_TIME_LIMIT_SECONDS = 20;

/**
 * Build the planning input from the railopt.* tables and ask the optimizer's
 * CP-SAT block planner for a plan. Only PENDING tasks are planned;
 * SCHEDULED and IN_PROGRESS work is treated as already committed.
 */
export async function generateBlockPlan(): Promise<
  BlockPlanResponse & { planning_date: string; horizon_days: number }
> {
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

  const result = await postJson<unknown, BlockPlanResponse>(
    config.optimizerServiceUrl,
    "/plan-blocks",
    {
      horizon_start: planningDate,
      horizon_days: horizonDays,
      time_limit_seconds: SOLVER_TIME_LIMIT_SECONDS,
      // Also solve the earlier one-task-per-section model for comparison.
      compare_modes: true,
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
    },
    // Two solves (coordinated + comparison) plus transfer.
    (2 * SOLVER_TIME_LIMIT_SECONDS + 30) * 1000,
  );

  return { ...result, planning_date: planningDate, horizon_days: horizonDays };
}
