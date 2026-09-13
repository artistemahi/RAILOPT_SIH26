import { pool } from "../config/database.js";

export async function getBlocks(limit = 50) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 500);
  const result = await pool.query(
    `
      SELECT
        b.block_id,
        b.block_name,
        b.block_type,
        b.controlling_department,
        b.start_location_id,
        b.end_location_id,
        b.max_duration_min,
        b.operational_constraints,
        b.status,
        COUNT(DISTINCT br.task_id) AS task_count,
        COUNT(DISTINCT bs.section_id) AS section_count,
        COUNT(DISTINCT bw.window_id) AS window_count
      FROM railopt.blocks b
      LEFT JOIN railopt.block_requirements br ON br.block_id = b.block_id
      LEFT JOIN railopt.block_sections bs ON bs.block_id = b.block_id
      LEFT JOIN railopt.block_windows bw ON bw.block_id = b.block_id
      GROUP BY
        b.block_id, b.block_name, b.block_type, b.controlling_department,
        b.start_location_id, b.end_location_id, b.max_duration_min,
        b.operational_constraints, b.status
      ORDER BY b.status, b.block_id
      LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows;
}

export async function getBlockById(blockId: string) {
  const [blockResult, sectionsResult, requirementsResult, windowsResult] = await Promise.all([
    pool.query(
      `SELECT block_id, block_name, block_type, controlling_department,
              start_location_id, end_location_id, max_duration_min,
              operational_constraints, status
       FROM railopt.blocks WHERE block_id = $1 LIMIT 1`,
      [blockId],
    ),
    pool.query(
      `SELECT bs.block_section_id, bs.section_id, bs.sequence_order, s.section_code
       FROM railopt.block_sections bs
       JOIN railopt.sections s ON s.section_id = bs.section_id
       WHERE bs.block_id = $1
       ORDER BY bs.sequence_order NULLS LAST, bs.block_section_id`,
      [blockId],
    ),
    pool.query(
      `SELECT task_id, required_block_type, minimum_block_duration_min,
              setup_duration_min, release_duration_min,
              requires_power_isolation, requires_traffic_block, requires_signal_block
       FROM railopt.block_requirements WHERE block_id = $1 ORDER BY task_id`,
      [blockId],
    ),
    pool.query(
      `SELECT window_id, section_id, start_time, end_time, duration_min,
              block_type, available, status, source
       FROM railopt.block_windows WHERE block_id = $1 ORDER BY start_time, window_id`,
      [blockId],
    ),
  ]);

  if (blockResult.rows.length === 0) return null;
  return {
    ...blockResult.rows[0],
    sections: sectionsResult.rows,
    requirements: requirementsResult.rows,
    windows: windowsResult.rows,
  };
}
