import { pool } from "../config/database.js";
import {
  describeTask,
  getActiveTasks,
  getPlanningDate,
  toPriorityLevel,
} from "./planning-context.js";

const TASKS_PER_SECTION = 8;

type Station = {
  locationId: string;
  stationCode: string;
  name: string;
  latitude: number;
  longitude: number;
  assetCount: number;
  onNetwork: boolean;
};

type NetworkSection = {
  sectionId: string;
  fromStation: string;
  toStation: string;
  path: Array<[number, number]>;
  lengthKm: number | null;
  trackCount: number | null;
  electrified: boolean | null;
  operationalStatus: string | null;
  activeTasks: number;
  p1Tasks: number;
  p2Tasks: number;
  topPriority: number | null;
  openCriticalDefects: number;
  outOfServiceAssets: number;
  availableWindows: number;
  trainsOnPlanningDate: number;
  topTasks: Array<{
    taskId: string;
    task: string;
    department: string;
    priorityScore: number;
    priority: "P1" | "P2" | "P3";
    status: string;
  }>;
};

export type NetworkResponse = {
  planningDate: string;
  horizonDays: number;
  stations: Station[];
  sections: NetworkSection[];
};

const HORIZON_DAYS = Number(process.env.PLANNING_HORIZON_DAYS) || 7;

/**
 * Stations and sections with coordinates plus per-section planning signals
 * (active tasks by priority, defects, windows in the horizon, trains on the
 * planning date). All values come from the railopt.* tables.
 */
export async function getNetwork(): Promise<NetworkResponse> {
  const planningDate = await getPlanningDate();
  const [tasks, stations, sections, sectionStats] = await Promise.all([
    getActiveTasks(planningDate),
    pool.query<{
      location_id: string;
      station_code: string | null;
      name: string;
      latitude: string | null;
      longitude: string | null;
      asset_count: string;
      on_network: boolean;
    }>(
      `SELECT l.location_id, l.station_code, l.name, l.latitude, l.longitude,
              (SELECT COUNT(*) FROM railopt.assets a
                WHERE a.location_code = l.location_id) AS asset_count,
              EXISTS (SELECT 1 FROM railopt.sections s
                WHERE l.location_id IN (s.from_location_id, s.to_location_id)) AS on_network
       FROM railopt.locations l
       ORDER BY l.location_id`,
    ),
    pool.query<{
      section_id: string;
      from_station: string;
      to_station: string;
      from_lat: string | null;
      from_lon: string | null;
      to_lat: string | null;
      to_lon: string | null;
      length_km: string | null;
      track_count: number | null;
      electrified: boolean | null;
      operational_status: string | null;
    }>(
      `SELECT s.section_id,
              COALESCE(f.station_code, s.from_location_id) AS from_station,
              COALESCE(t.station_code, s.to_location_id) AS to_station,
              f.latitude AS from_lat, f.longitude AS from_lon,
              t.latitude AS to_lat, t.longitude AS to_lon,
              s.length_km, s.track_count, s.electrified, s.operational_status
       FROM railopt.sections s
       JOIN railopt.locations f ON f.location_id = s.from_location_id
       JOIN railopt.locations t ON t.location_id = s.to_location_id
       ORDER BY s.section_id`,
    ),
    pool.query<{
      section_id: string;
      open_critical_defects: string;
      out_of_service_assets: string;
      available_windows: string;
      trains: string;
    }>(
      `SELECT s.section_id,
              (SELECT COUNT(*) FROM railopt.defects d
                WHERE d.section_id = s.section_id AND d.status = 'OPEN'
                  AND d.severity = 'CRITICAL') AS open_critical_defects,
              (SELECT COUNT(*) FROM railopt.assets a
                WHERE a.section_id = s.section_id
                  AND a.status = 'OUT_OF_SERVICE') AS out_of_service_assets,
              (SELECT COUNT(DISTINCT ws.window_id) FROM railopt.window_sections ws
                JOIN railopt.block_windows bw ON bw.window_id = ws.window_id
                WHERE ws.section_id = s.section_id AND bw.available
                  AND bw.start_time >= $1::date
                  AND bw.start_time < $1::date + $2::int) AS available_windows,
              (SELECT COUNT(*) FROM railopt.train_movements tm
                WHERE tm.section_id = s.section_id
                  AND tm.entry_time >= $1::date
                  AND tm.entry_time < $1::date + 1) AS trains
       FROM railopt.sections s`,
      [planningDate, HORIZON_DAYS],
    ),
  ]);

  const stats = new Map(sectionStats.rows.map((row) => [row.section_id, row]));

  return {
    planningDate,
    horizonDays: HORIZON_DAYS,
    stations: stations.rows
      .filter((row) => row.latitude !== null && row.longitude !== null)
      .map((row) => ({
        locationId: row.location_id,
        stationCode: row.station_code ?? row.location_id,
        name: row.name,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        assetCount: Number(row.asset_count),
        onNetwork: row.on_network,
      })),
    sections: sections.rows.map((row) => {
      const sectionTasks = tasks.filter((task) => task.sectionId === row.section_id);
      const levels = sectionTasks.map((task) => toPriorityLevel(task.priorityScore));
      const stat = stats.get(row.section_id);
      return {
        sectionId: row.section_id,
        fromStation: row.from_station,
        toStation: row.to_station,
        path: [
          [Number(row.from_lat), Number(row.from_lon)],
          [Number(row.to_lat), Number(row.to_lon)],
        ],
        lengthKm: row.length_km === null ? null : Number(row.length_km),
        trackCount: row.track_count,
        electrified: row.electrified,
        operationalStatus: row.operational_status,
        activeTasks: sectionTasks.length,
        p1Tasks: levels.filter((level) => level === "P1").length,
        p2Tasks: levels.filter((level) => level === "P2").length,
        topPriority: sectionTasks[0]?.priorityScore ?? null,
        openCriticalDefects: Number(stat?.open_critical_defects ?? 0),
        outOfServiceAssets: Number(stat?.out_of_service_assets ?? 0),
        availableWindows: Number(stat?.available_windows ?? 0),
        trainsOnPlanningDate: Number(stat?.trains ?? 0),
        topTasks: sectionTasks.slice(0, TASKS_PER_SECTION).map((task) => ({
          taskId: task.taskId,
          task: describeTask(task),
          department: task.department,
          priorityScore: task.priorityScore,
          priority: toPriorityLevel(task.priorityScore),
          status: task.status,
        })),
      };
    }),
  };
}
