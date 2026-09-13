import { pool } from "../config/database.js";

export async function getSections(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const result = await pool.query(
    `
      SELECT
        s.section_id,
        s.section_code,
        s.from_location_id,
        fl.station_code AS from_station_code,
        fl.name AS from_name,
        fl.latitude AS from_latitude,
        fl.longitude AS from_longitude,
        s.to_location_id,
        tl.station_code AS to_station_code,
        tl.name AS to_name,
        tl.latitude AS to_latitude,
        tl.longitude AS to_longitude,
        s.length_km,
        s.track_count,
        s.electrified,
        s.operational_status
      FROM railopt.sections s
      JOIN railopt.locations fl ON fl.location_id = s.from_location_id
      JOIN railopt.locations tl ON tl.location_id = s.to_location_id
      ORDER BY s.section_code NULLS LAST, s.section_id
      LIMIT $1
    `,
    [safeLimit],
  );
  return result.rows;
}
