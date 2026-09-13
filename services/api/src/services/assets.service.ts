import { pool } from "../config/database.js";

export async function getAssets(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);

  const result = await pool.query(
    `
      SELECT
        a.asset_id,
        a.asset_type,
        a.department,
        a.section_id,
        a.location_code,
        a.criticality,
        a.status,
        a.installation_date,
        a.last_maintenance_date,
        a.next_due_date,
        a.condition_score,
        s.section_code,
        s.from_location_id,
        s.to_location_id,
        COUNT(DISTINCT t.task_id) AS task_count,
        COUNT(DISTINCT d.defect_id) AS defect_count
      FROM railopt.assets a
      LEFT JOIN railopt.sections s ON s.section_id = a.section_id
      LEFT JOIN railopt.maintenance_tasks t ON t.asset_id = a.asset_id
      LEFT JOIN railopt.defects d ON d.asset_id = a.asset_id
      GROUP BY
        a.asset_id, a.asset_type, a.department, a.section_id, a.location_code,
        a.criticality, a.status, a.installation_date, a.last_maintenance_date,
        a.next_due_date, a.condition_score,
        s.section_code, s.from_location_id, s.to_location_id
      ORDER BY a.condition_score ASC NULLS LAST, a.criticality DESC NULLS LAST, a.asset_id
      LIMIT $1
    `,
    [safeLimit],
  );

  return result.rows;
}

export async function getAssetById(assetId: string) {
  const result = await pool.query(
    `
      SELECT
        a.asset_id,
        a.asset_type,
        a.department,
        a.section_id,
        a.location_code,
        a.criticality,
        a.status,
        a.installation_date,
        a.last_maintenance_date,
        a.next_due_date,
        a.condition_score,
        s.section_code,
        s.from_location_id,
        s.to_location_id,
        COUNT(DISTINCT t.task_id) AS task_count,
        COUNT(DISTINCT d.defect_id) AS defect_count
      FROM railopt.assets a
      LEFT JOIN railopt.sections s ON s.section_id = a.section_id
      LEFT JOIN railopt.maintenance_tasks t ON t.asset_id = a.asset_id
      LEFT JOIN railopt.defects d ON d.asset_id = a.asset_id
      WHERE a.asset_id = $1
      GROUP BY
        a.asset_id, a.asset_type, a.department, a.section_id, a.location_code,
        a.criticality, a.status, a.installation_date, a.last_maintenance_date,
        a.next_due_date, a.condition_score,
        s.section_code, s.from_location_id, s.to_location_id
      LIMIT 1
    `,
    [assetId],
  );

  return result.rows[0] ?? null;
}
