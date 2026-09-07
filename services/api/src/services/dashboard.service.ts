import { pool } from "../config/database.js";
import { redisGet, redisSet } from "../integrations/redis.client.js";
import { config } from "../config/env.js";

const DASHBOARD_CACHE_KEY = "railopt:dashboard:v1";

type DashboardResponse = {
  assetSummary: Array<{
    label: string;
    value: string;
    supportText?: string;
    tone: "default" | "danger" | "warning" | "success";
  }>;
  maintenanceTasks: Array<{
    assetId: string;
    task: string;
    department: string;
    priority: "P1" | "P2" | "P3";
    riskScore: number;
    overdueDays: number;
  }>;
  recommendedBlock: {
    blockId: string;
    corridor: string;
    timeWindow: string;
    durationHours: string;
    compatibleTasks: number;
    trainImpact: string;
    priorityCoverage: string;
  };
  corridorStatus: Array<{
    name: string;
    state: "Normal" | "Busy" | "Blocked" | "Selected";
  }>;
  trainImpact: Array<{
    name: "Low Impact" | "Medium Impact" | "High Impact";
    value: number;
    color: string;
  }>;
  alerts: Array<{
    severity: "CRITICAL" | "WARNING" | "INFO";
    title: string;
    timestamp: string;
  }>;
};

const corridorStatus: DashboardResponse["corridorStatus"] = [
  { name: "NDLS", state: "Normal" },
  { name: "ALD", state: "Normal" },
  { name: "CNB", state: "Busy" },
  { name: "LKO", state: "Selected" },
];

const alerts: DashboardResponse["alerts"] = [
  {
    severity: "CRITICAL",
    title: "Signal failure reported at S-104",
    timestamp: "20 May 2025 | 09:45 AM",
  },
  {
    severity: "WARNING",
    title: "C1 corridor congestion expected",
    timestamp: "20 May 2025 | 09:20 AM",
  },
  {
    severity: "INFO",
    title: "Block B103 completed successfully",
    timestamp: "20 May 2025 | 08:30 AM",
  },
];

const impactColors = {
  "Low Impact": "#22c55e",
  "Medium Impact": "#f59e0b",
  "High Impact": "#ef4444",
} as const;

function formatDuration(durationMin: number): string {
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} Hrs`;
}

function formatTimeWindow(startTime: string, endTime: string): string {
  return `${startTime.slice(0, 5)} – ${endTime.slice(0, 5)}`;
}

async function getDashboardDataFromPostgres(): Promise<DashboardResponse> {
  const [assetsResult, tasksResult, blocksResult, impactsResult] =
    await Promise.all([
      pool.query<{ id: string }>("SELECT id FROM assets ORDER BY id"),
      pool.query<{
        asset_id: string;
        task: string;
        department: string;
        priority: "P1" | "P2" | "P3";
        risk_score: number;
        overdue_days: number;
      }>(
        `SELECT asset_id, task, department, priority, risk_score, overdue_days
         FROM maintenance_tasks
         ORDER BY risk_score DESC, id`,
      ),
      pool.query<{
        id: string;
        section: string;
        start_time: string;
        end_time: string;
        duration_min: number;
        train_impact: string;
        priority_coverage: string;
        status: string;
      }>(
        `SELECT id, section, start_time, end_time, duration_min, train_impact,
                priority_coverage, status
         FROM maintenance_blocks
         WHERE status IN ('Active', 'Planned')
         ORDER BY CASE WHEN status = 'Active' THEN 0 ELSE 1 END, id`,
      ),
      pool.query<{ impact_level: "Low" | "Medium" | "High" }>(
        "SELECT impact_level FROM train_impacts",
      ),
    ]);

  const assets = assetsResult.rows;
  const tasks = tasksResult.rows;
  const blocks = blocksResult.rows;
  const impacts = impactsResult.rows;
  const highRiskTaskCount = tasks.filter(
    (task) => task.risk_score >= 70,
  ).length;
  const impactedAssetIds = new Set(
    tasks.filter((task) => task.overdue_days > 0).map((task) => task.asset_id),
  );

  // Synthetic availability: each asset with an overdue maintenance task is unavailable.
  const availability = assets.length
    ? Math.round(
        ((assets.length - impactedAssetIds.size) / assets.length) * 100,
      )
    : 100;

  const recommendedBlock = blocks[0];
  if (!recommendedBlock) {
    throw new Error("No active or planned maintenance block is available");
  }

  const impactLabels = ["Low Impact", "Medium Impact", "High Impact"] as const;
  const trainImpact = impactLabels.map((label) => {
    const level = label.replace(" Impact", "") as "Low" | "Medium" | "High";
    const count = impacts.filter(
      (impact) => impact.impact_level === level,
    ).length;
    return {
      name: label,
      value: impacts.length ? Math.round((count / impacts.length) * 100) : 0,
      color: impactColors[label],
    };
  });

  return {
    assetSummary: [
      { label: "Total Assets", value: String(assets.length), tone: "default" },
      {
        label: "High Risk Assets",
        value: String(highRiskTaskCount),
        supportText: assets.length
          ? `(${((highRiskTaskCount / assets.length) * 100).toFixed(1)}%)`
          : "(0.0%)",
        tone: "danger",
      },
      { label: "Active Blocks", value: String(blocks.length), tone: "warning" },
      {
        label: "Asset Availability",
        value: `${availability}%`,
        tone: "success",
      },
      {
        label: "Train Impact",
        value: impacts.some((impact) => impact.impact_level === "High")
          ? "HIGH"
          : impacts.some((impact) => impact.impact_level === "Medium")
            ? "MEDIUM"
            : "LOW",
        tone: "default",
      },
    ],
    maintenanceTasks: tasks.map((task) => ({
      assetId: task.asset_id,
      task: task.task,
      department: task.department,
      priority: task.priority,
      riskScore: Number(task.risk_score),
      overdueDays: Number(task.overdue_days),
    })),
    recommendedBlock: {
      blockId: recommendedBlock.id,
      corridor: "C1",
      timeWindow: formatTimeWindow(
        recommendedBlock.start_time,
        recommendedBlock.end_time,
      ),
      durationHours: formatDuration(Number(recommendedBlock.duration_min)),
      compatibleTasks: tasks.filter((task) => task.priority !== "P3").length,
      trainImpact: recommendedBlock.train_impact,
      priorityCoverage: recommendedBlock.priority_coverage,
    },
    corridorStatus,
    trainImpact,
    alerts,
  };
}

export async function getDashboardData(): Promise<DashboardResponse> {
  const cachedDashboard = await redisGet(DASHBOARD_CACHE_KEY);
  if (cachedDashboard) {
    try {
      return JSON.parse(cachedDashboard) as DashboardResponse;
    } catch {
      // Ignore malformed cache data and refresh it from PostgreSQL.
    }
  }

  const dashboard = await getDashboardDataFromPostgres();
  await redisSet(
    DASHBOARD_CACHE_KEY,
    JSON.stringify(dashboard),
    config.dashboardCacheTtlSeconds,
  );
  return dashboard;
}

export type { DashboardResponse };
