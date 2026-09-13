import { pool } from "../config/database.js";
import { config } from "../config/env.js";
import { postJson } from "../integrations/python-service.client.js";
import type {
  BlockPlanOptimizeRequest,
  BlockPlanOptimizeResponse,
} from "../types/python-services.js";

const TABLE_QUERIES = {
  tasks: `
    SELECT
      t.*,
      COALESCE(pp.final_priority_score, t.priority_score, 0) AS planning_priority
    FROM railopt.maintenance_tasks t
    LEFT JOIN LATERAL (
      SELECT final_priority_score
      FROM railopt.priority_predictions
      WHERE task_id = t.task_id
      ORDER BY created_at DESC
      LIMIT 1
    ) pp ON TRUE
    ORDER BY t.task_id
  `,
  dependencies: `SELECT * FROM railopt.dependencies ORDER BY dependency_id`,
  task_resources: `SELECT * FROM railopt.task_resources ORDER BY task_resource_id`,
  resources: `SELECT * FROM railopt.resources ORDER BY resource_id`,
  blocks: `SELECT * FROM railopt.blocks ORDER BY block_id`,
  block_requirements: `SELECT * FROM railopt.block_requirements ORDER BY task_id, block_id`,
  block_sections: `SELECT * FROM railopt.block_sections ORDER BY block_id, sequence_order NULLS LAST`,
  windows: `SELECT * FROM railopt.block_windows ORDER BY window_id`,
  window_sections: `SELECT * FROM railopt.window_sections ORDER BY window_id, section_id`,
  trains: `SELECT * FROM railopt.train_movements ORDER BY movement_id`,
  compatibility_rules: `SELECT * FROM railopt.compatibility_rules ORDER BY rule_id`,
} as const;

export async function optimizeBlockPlan(
  options: Pick<BlockPlanOptimizeRequest, "time_limit_seconds" | "workers"> = {},
): Promise<BlockPlanOptimizeResponse> {
  const entries = await Promise.all(
    Object.entries(TABLE_QUERIES).map(async ([name, query]) => {
      const result = await pool.query(query);
      return [name, result.rows] as const;
    }),
  );

  const request: BlockPlanOptimizeRequest = {
    tables: Object.fromEntries(entries),
    time_limit_seconds: options.time_limit_seconds,
    workers: options.workers,
  };

  return postJson<BlockPlanOptimizeRequest, BlockPlanOptimizeResponse>(
    config.optimizerServiceUrl,
    "/optimize-blocks",
    request,
    180_000,
  );
}
