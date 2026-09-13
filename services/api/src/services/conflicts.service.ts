import { pool } from "../config/database.js";

export async function getConflicts(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const result = await pool.query(
    `
      SELECT * FROM (
        SELECT
          'WINDOW_OVERLAP' AS conflict_type,
          w1.window_id AS source_id,
          w2.window_id AS conflicting_id,
          w1.section_id,
          w1.start_time,
          w1.end_time,
          'Two block windows overlap on the same section' AS reason
        FROM railopt.block_windows w1
        JOIN railopt.block_windows w2
          ON w1.section_id = w2.section_id
         AND w1.window_id < w2.window_id
         AND w1.start_time < w2.end_time
         AND w2.start_time < w1.end_time

        UNION ALL

        SELECT
          'TRAIN_BLOCK_OVERLAP' AS conflict_type,
          bw.window_id AS source_id,
          tm.movement_id AS conflicting_id,
          bw.section_id,
          bw.start_time,
          bw.end_time,
          'A train movement overlaps an available block window on the same section' AS reason
        FROM railopt.block_windows bw
        JOIN railopt.train_movements tm
          ON tm.section_id = bw.section_id
         AND tm.entry_time < bw.end_time
         AND bw.start_time < tm.exit_time
        WHERE COALESCE(bw.available, false) = true
      ) conflicts
      ORDER BY start_time, conflict_type, source_id, conflicting_id
      LIMIT $1
    `,
    [safeLimit],
  );

  return result.rows;
}
