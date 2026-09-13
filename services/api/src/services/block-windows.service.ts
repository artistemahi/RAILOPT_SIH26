import { pool } from "../config/database.js";

export async function getBlockWindows(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 1000);
  const result = await pool.query(
    `
      SELECT
        bw.window_id,
        bw.block_id,
        bw.section_id,
        s.section_code,
        bw.start_time,
        bw.end_time,
        bw.duration_min,
        bw.block_type,
        bw.available,
        bw.status,
        bw.source
      FROM railopt.block_windows bw
      JOIN railopt.sections s ON s.section_id = bw.section_id
      ORDER BY bw.start_time, bw.window_id
      LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows;
}

export async function getBlockWindowById(windowId: string) {
  const result = await pool.query(
    `
      SELECT
        bw.window_id,
        bw.block_id,
        bw.section_id,
        s.section_code,
        bw.start_time,
        bw.end_time,
        bw.duration_min,
        bw.block_type,
        bw.available,
        bw.status,
        bw.source
      FROM railopt.block_windows bw
      JOIN railopt.sections s ON s.section_id = bw.section_id
      WHERE bw.window_id = $1
      LIMIT 1
    `,
    [windowId],
  );
  return result.rows[0] ?? null;
}
