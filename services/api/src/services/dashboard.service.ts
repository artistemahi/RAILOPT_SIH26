import { pool } from "../config/database.js";
import { redisGet, redisSet } from "../integrations/redis.client.js";
import { config } from "../config/env.js";

const DASHBOARD_CACHE_KEY = "railopt:dashboard:v2";

type DashboardResponse = {
  assetSummary: Array<{ label: string; value: string; supportText?: string; tone: "default" | "danger" | "warning" | "success" }>;
  maintenanceTasks: Array<{ assetId: string; task: string; department: string; priority: "P1" | "P2" | "P3"; riskScore: number; overdueDays: number }>;
  recommendedBlock: { blockId: string; corridor: string; timeWindow: string; durationHours: string; compatibleTasks: number; trainImpact: string; priorityCoverage: string } | null;
  corridorStatus: Array<{ name: string; state: "Normal" | "Busy" | "Blocked" | "Selected" }>;
  trainImpact: Array<{ name: "Low Impact" | "Medium Impact" | "High Impact"; value: number; color: string }>;
  alerts: Array<{ severity: "CRITICAL" | "WARNING" | "INFO"; title: string; timestamp: string }>;
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")} Hrs`;
}

async function getDashboardDataFromPostgres(): Promise<DashboardResponse> {
  const [assets, tasks, blocks, windows, trains, sections] = await Promise.all([
    pool.query(`SELECT asset_id, section_id, status, condition_score FROM railopt.assets`),
    pool.query(`
      SELECT t.asset_id, t.description, t.department,
             COALESCE(pp.final_priority_score, t.priority_score, 0) AS risk_score,
             GREATEST(CURRENT_DATE - COALESCE(t.due_date, CURRENT_DATE), 0) AS overdue_days
      FROM railopt.maintenance_tasks t
      LEFT JOIN LATERAL (
        SELECT final_priority_score FROM railopt.priority_predictions
        WHERE task_id = t.task_id ORDER BY created_at DESC LIMIT 1
      ) pp ON TRUE
      ORDER BY COALESCE(pp.final_priority_score, t.priority_score, 0) DESC, t.due_date ASC NULLS LAST
      LIMIT 20
    `),
    pool.query(`SELECT block_id, block_name, status FROM railopt.blocks ORDER BY block_id`),
    pool.query(`SELECT window_id, block_id, section_id, start_time, end_time, duration_min, available FROM railopt.block_windows ORDER BY start_time`),
    pool.query(`SELECT section_id, is_freight FROM railopt.train_movements`),
    pool.query(`SELECT section_id, section_code, operational_status FROM railopt.sections ORDER BY section_code NULLS LAST, section_id`),
  ]);

  const totalAssets = assets.rowCount ?? 0;
  const availableAssets = assets.rows.filter((a) => String(a.status).toLowerCase() === "active").length;
  const highRiskAssets = assets.rows.filter((a) => Number(a.condition_score) < 40).length;
  const activeBlocks = blocks.rows.filter((b) => ["Active", "Planned", "AVAILABLE"].includes(String(b.status))).length;
  const totalWindows = windows.rowCount ?? 0;
  const availableWindows = windows.rows.filter((w) => w.available === true).length;

  const lowCount = windows.rows.filter((w) => w.available === true && Number(w.duration_min) <= 60).length;
  const mediumCount = windows.rows.filter((w) => w.available === true && Number(w.duration_min) > 60 && Number(w.duration_min) <= 180).length;
  const highCount = Math.max(0, availableWindows - lowCount - mediumCount);
  const trainTotal = trains.rowCount ?? 0;

  const recommended = windows.rows.find((w) => w.available === true) ?? windows.rows[0];
  let recommendedBlock: DashboardResponse["recommendedBlock"] = null;
  if (recommended) {
    const block = blocks.rows.find((b) => b.block_id === recommended.block_id);
    const section = sections.rows.find((s) => s.section_id === recommended.section_id);
    recommendedBlock = {
      blockId: recommended.block_id,
      corridor: section?.section_code ?? recommended.section_id,
      timeWindow: `${new Date(recommended.start_time).toISOString().slice(11, 16)} – ${new Date(recommended.end_time).toISOString().slice(11, 16)}`,
      durationHours: formatDuration(Number(recommended.duration_min)),
      compatibleTasks: tasks.rows.length,
      trainImpact: trainTotal ? "See conflict analysis" : "LOW",
      priorityCoverage: tasks.rows.length ? "Available" : "None",
    };
    if (block) recommendedBlock.blockId = block.block_id;
  }

  return {
    assetSummary: [
      { label: "Total Assets", value: String(totalAssets), tone: "default" },
      { label: "High Risk Assets", value: String(highRiskAssets), tone: "danger" },
      { label: "Active Blocks", value: String(activeBlocks), tone: "warning" },
      { label: "Asset Availability", value: totalAssets ? `${Math.round((availableAssets / totalAssets) * 100)}%` : "100%", tone: "success" },
      { label: "Available Windows", value: String(availableWindows), supportText: `of ${totalWindows}`, tone: "default" },
    ],
    maintenanceTasks: tasks.rows.map((task) => ({
      assetId: task.asset_id,
      task: task.description ?? task.asset_id,
      department: task.department ?? "Unknown",
      priority: Number(task.risk_score) >= 80 ? "P1" : Number(task.risk_score) >= 60 ? "P2" : "P3",
      riskScore: Number(task.risk_score),
      overdueDays: Number(task.overdue_days),
    })),
    recommendedBlock,
    corridorStatus: sections.rows.map((section, index) => ({
      name: section.section_code ?? section.section_id,
      state: index === 0 ? "Selected" : section.operational_status === "BLOCKED" ? "Blocked" : "Normal",
    })),
    trainImpact: [
      { name: "Low Impact", value: trainTotal ? Math.round((lowCount / Math.max(totalWindows, 1)) * 100) : 0, color: "#22c55e" },
      { name: "Medium Impact", value: trainTotal ? Math.round((mediumCount / Math.max(totalWindows, 1)) * 100) : 0, color: "#f59e0b" },
      { name: "High Impact", value: trainTotal ? Math.round((highCount / Math.max(totalWindows, 1)) * 100) : 0, color: "#ef4444" },
    ],
    alerts: [],
  };
}

export async function getDashboardData(): Promise<DashboardResponse> {
  const cached = await redisGet(DASHBOARD_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached) as DashboardResponse; } catch { /* refresh */ }
  }
  const dashboard = await getDashboardDataFromPostgres();
  await redisSet(DASHBOARD_CACHE_KEY, JSON.stringify(dashboard), config.dashboardCacheTtlSeconds);
  return dashboard;
}

export type { DashboardResponse };
