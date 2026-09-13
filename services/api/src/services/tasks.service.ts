import { pool } from "../config/database.js";

export async function getTasks(limit = 50) {
  const safeLimit = Math.min(
    Math.max(Number(limit) || 50, 1),
    500,
  );

  const result = await pool.query(
    `
      SELECT
        t.task_id,
        t.asset_id,
        t.department,
        t.task_type,
        t.maintenance_type,
        t.section_id,
        t.location_code,
        t.description,
        t.reported_date,
        t.due_date,
        t.estimated_duration_min,
        t.status,
        t.criticality,
        t.urgency,
        t.operational_impact,
        t.can_be_rescheduled,
        t.priority_category,
        t.required_block_type,
        t.is_overdue,
        t.source_defect_id,

        a.asset_type,
        a.status AS asset_status,
        a.installation_date,
        a.last_maintenance_date,
        a.next_due_date,
        a.condition_score,

        s.section_code,
        s.from_location_id,
        s.to_location_id,

        pp.calculated_priority_score,
        pp.predicted_priority_score,
        pp.final_priority_score,
        pp.model_version,
        pp.run_id AS priority_run_id,
        pp.created_at AS priority_created_at

      FROM railopt.maintenance_tasks t

      LEFT JOIN railopt.assets a
        ON a.asset_id = t.asset_id

      LEFT JOIN railopt.sections s
        ON s.section_id = t.section_id

      LEFT JOIN LATERAL (
        SELECT
          calculated_priority_score,
          predicted_priority_score,
          final_priority_score,
          model_version,
          run_id,
          created_at
        FROM railopt.priority_predictions
        WHERE task_id = t.task_id
        ORDER BY created_at DESC
        LIMIT 1
      ) pp ON TRUE

      ORDER BY
        COALESCE(pp.final_priority_score, 0) DESC,
        t.due_date ASC NULLS LAST

      LIMIT $1
    `,
    [safeLimit],
  );

  return result.rows;
}

export async function getTaskById(taskId: string) {
  const result = await pool.query(
    `
      SELECT
        t.task_id,
        t.asset_id,
        t.department,
        t.task_type,
        t.maintenance_type,
        t.section_id,
        t.location_code,
        t.description,
        t.reported_date,
        t.due_date,
        t.estimated_duration_min,
        t.status,
        t.criticality,
        t.urgency,
        t.operational_impact,
        t.can_be_rescheduled,
        t.priority_category,
        t.required_block_type,
        t.is_overdue,
        t.source_defect_id,

        a.asset_type,
        a.status AS asset_status,
        a.installation_date,
        a.last_maintenance_date,
        a.next_due_date,
        a.condition_score,

        s.section_code,
        s.from_location_id,
        s.to_location_id,

        pp.calculated_priority_score,
        pp.predicted_priority_score,
        pp.final_priority_score,
        pp.model_version,
        pp.run_id AS priority_run_id,
        pp.created_at AS priority_created_at

      FROM railopt.maintenance_tasks t

      LEFT JOIN railopt.assets a
        ON a.asset_id = t.asset_id

      LEFT JOIN railopt.sections s
        ON s.section_id = t.section_id

      LEFT JOIN LATERAL (
        SELECT
          calculated_priority_score,
          predicted_priority_score,
          final_priority_score,
          model_version,
          run_id,
          created_at
        FROM railopt.priority_predictions
        WHERE task_id = t.task_id
        ORDER BY created_at DESC
        LIMIT 1
      ) pp ON TRUE

      WHERE t.task_id = $1

      LIMIT 1
    `,
    [taskId],
  );

  return result.rows[0] ?? null;
}