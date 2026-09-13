import crypto from "node:crypto";

import { pool } from "../config/database.js";
import { predictPriority } from "./ml.service.js";

import type {
  PriorityPredictionInput,
  PriorityPredictionResponse,
} from "../types/python-services.js";

const MODEL_VERSION = "manas-xgboost-v1";

export async function generatePriorityScores(): Promise<
  PriorityPredictionResponse & {
    run_id: string;
  }
> {
  // ---------------------------------------------------------
  // 1. Fetch all required data from PostgreSQL
  // ---------------------------------------------------------
  const [tasksResult, assetsResult, defectsResult, trainsResult] =
    await Promise.all([
      pool.query(`
        SELECT *
        FROM railopt.maintenance_tasks
      `),

      pool.query(`
        SELECT *
        FROM railopt.assets
      `),

      pool.query(`
        SELECT *
        FROM railopt.defects
      `),

      pool.query(`
        SELECT *
        FROM railopt.train_movements
      `),
    ]);

  // ---------------------------------------------------------
  // 2. Build ML request
  // ---------------------------------------------------------
  const input: PriorityPredictionInput = {
    tasks: tasksResult.rows,
    assets: assetsResult.rows,
    defects: defectsResult.rows,
    trains: trainsResult.rows,
  };

  // ---------------------------------------------------------
  // 3. Call Manas priority ML service
  // ---------------------------------------------------------
  const prediction = await predictPriority(input);

  // ---------------------------------------------------------
  // 4. Create unique prediction run ID
  // ---------------------------------------------------------
  const runId = crypto.randomUUID();

  // ---------------------------------------------------------
  // 5. Save predictions into PostgreSQL
  // ---------------------------------------------------------
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const result of prediction.results) {
      if (!result.task_id) {
        throw new Error("ML returned a prediction without task_id.");
      }

      await client.query(
        `
          INSERT INTO railopt.priority_predictions (
            run_id,
            task_id,
            asset_id,
            calculated_priority_score,
            predicted_priority_score,
            final_priority_score,
            model_version,
            created_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            NOW()
          )
        `,
        [
          runId,
          result.task_id,
          result.asset_id,
          result.calculated_priority_score,
          result.predicted_priority_score,
          result.final_priority_score,
          MODEL_VERSION,
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  // ---------------------------------------------------------
  // 6. Return API response
  // ---------------------------------------------------------
  return {
    ...prediction,
    run_id: runId,
  };
}
