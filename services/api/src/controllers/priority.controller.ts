import type { Request, Response } from "express";
import { generatePriorityScores } from "../services/priority.service.js";
import { pool } from "../config/database.js";

export async function predictPriority(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await generatePriorityScores();
    res.json(result);
  } catch (error) {
    console.error("Priority prediction failed:", error);

    res.status(500).json({
      success: false,
      error: "Priority prediction failed",
    });
  }
}

export async function getPriorities(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 50, 1),
      500,
    );

    const minScore =
      req.query.minScore !== undefined
        ? Number(req.query.minScore)
        : null;

    const result = await pool.query(
      `
        SELECT DISTINCT ON (pp.task_id)
          pp.task_id,
          pp.asset_id,
          pp.calculated_priority_score,
          pp.predicted_priority_score,
          pp.final_priority_score,
          pp.model_version,
          pp.run_id,
          pp.created_at
        FROM railopt.priority_predictions pp
        WHERE ($1::numeric IS NULL OR pp.final_priority_score >= $1)
        ORDER BY
          pp.task_id,
          pp.created_at DESC
      `,
      [minScore],
    );

    const ranked = result.rows
      .sort(
        (a, b) =>
          Number(b.final_priority_score) -
          Number(a.final_priority_score),
      )
      .slice(0, limit);

    res.json({
      success: true,
      count: ranked.length,
      results: ranked,
    });
  } catch (error) {
    console.error("Failed to fetch priorities:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch priorities",
    });
  }
}

export async function getPriorityByTaskId(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { taskId } = req.params;

    const result = await pool.query(
      `
        SELECT
          pp.task_id,
          pp.asset_id,
          pp.calculated_priority_score,
          pp.predicted_priority_score,
          pp.final_priority_score,
          pp.model_version,
          pp.run_id,
          pp.created_at
        FROM railopt.priority_predictions pp
        WHERE pp.task_id = $1
        ORDER BY pp.created_at DESC
        LIMIT 1
      `,
      [taskId],
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "Priority prediction not found",
      });
      return;
    }

    res.json({
      success: true,
      result: result.rows[0],
    });
  } catch (error) {
    console.error("Failed to fetch task priority:", error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch task priority",
    });
  }
}