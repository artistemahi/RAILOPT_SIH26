import { pool } from "../config/database.js";
import { redisGet, redisSet } from "../integrations/redis.client.js";
import { config } from "../config/env.js";
import {
  describeTask,
  formatClock,
  formatDateLabel,
  formatDuration,
  getActiveTasks,
  getPlanningDate,
  getSections,
  getWindowsForDate,
  pickTopCandidateWindow,
  titleCase,
  toPriorityCoverage,
  toPriorityLevel,
  type PriorityLevel,
} from "./planning-context.js";

const DASHBOARD_CACHE_KEY = "railopt:dashboard:v2";
const TOP_TASKS = 5;

type DashboardResponse = {
  planningDate: string;
  assetSummary: Array<{
    label: string;
    value: string;
    supportText?: string;
    tone: "default" | "danger" | "warning" | "success";
  }>;
  maintenanceTasks: Array<{
    taskId: string;
    assetId: string;
    task: string;
    department: string;
    priority: PriorityLevel;
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
  } | null;
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

const impactColors = {
  "Low Impact": "#22c55e",
  "Medium Impact": "#f59e0b",
  "High Impact": "#ef4444",
} as const;

async function getAssetCounts(): Promise<{ total: number; active: number }> {
  const result = await pool.query<{ total: string; active: string }>(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active
     FROM railopt.assets`,
  );
  return {
    total: Number(result.rows[0].total),
    active: Number(result.rows[0].active),
  };
}

async function getOutOfServiceSections(): Promise<Set<string>> {
  const result = await pool.query<{ section_id: string }>(
    `SELECT DISTINCT section_id FROM railopt.assets WHERE status = 'OUT_OF_SERVICE'`,
  );
  return new Set(result.rows.map((row) => row.section_id));
}

async function getCriticalDefectAlerts(): Promise<DashboardResponse["alerts"]> {
  const result = await pool.query<{
    defect_id: string;
    asset_id: string;
    section_id: string;
    defect_type: string;
    reported: string;
  }>(
    `SELECT defect_id, asset_id, section_id, defect_type,
            to_char(reported_time, 'YYYY-MM-DD') AS reported
     FROM railopt.defects
     WHERE status = 'OPEN' AND severity = 'CRITICAL'
     ORDER BY reported_time DESC, defect_id
     LIMIT 2`,
  );
  return result.rows.map((row) => ({
    severity: "CRITICAL" as const,
    title: `Open critical ${titleCase(row.defect_type).toLowerCase()} defect on ${row.asset_id} (${row.section_id})`,
    timestamp: `Reported ${formatDateLabel(row.reported)}`,
  }));
}

async function getDashboardDataFromPostgres(): Promise<DashboardResponse> {
  const planningDate = await getPlanningDate();
  const tasks = await getActiveTasks(planningDate);
  const [assets, windows, sections, outOfService, defectAlerts] =
    await Promise.all([
      getAssetCounts(),
      getWindowsForDate(planningDate, tasks),
      getSections(),
      getOutOfServiceSections(),
      getCriticalDefectAlerts(),
    ]);

  const highPriorityTasks = tasks.filter(
    (task) => toPriorityLevel(task.priorityScore) !== "P3",
  ).length;
  const overdueTasks = tasks.filter((task) => task.overdueDays > 0).length;
  const availableWindows = windows.filter((window) => window.available);
  const trainOverlaps = availableWindows.reduce(
    (sum, window) => sum + window.overlappingTrains,
    0,
  );
  const highestImpact = availableWindows.some((window) => window.impact === "High")
    ? "HIGH"
    : availableWindows.some((window) => window.impact === "Medium")
      ? "MEDIUM"
      : "LOW";

  const topWindow = pickTopCandidateWindow(windows);
  const sectionLabels = new Map(
    sections.map((section) => [section.sectionId, section.label]),
  );

  // Main line: sections chained end to end from the first section's origin.
  // Branch sections share an origin station; keep the first (main-line) one.
  const bySource = new Map<string, (typeof sections)[number]>();
  for (const section of sections) {
    if (!bySource.has(section.fromStation)) bySource.set(section.fromStation, section);
  }
  const corridor: typeof sections = [];
  let cursor = sections[0];
  while (cursor && !corridor.includes(cursor)) {
    corridor.push(cursor);
    cursor = bySource.get(cursor.toStation) as (typeof sections)[number];
  }
  const busySections = new Set(
    windows.filter((window) => window.impact === "High").map((window) => window.sectionId),
  );
  const stationState = (sectionIds: string[]) => {
    if (topWindow && sectionIds.includes(topWindow.sectionId)) return "Selected" as const;
    if (sectionIds.some((id) => outOfService.has(id))) return "Blocked" as const;
    if (sectionIds.some((id) => busySections.has(id))) return "Busy" as const;
    return "Normal" as const;
  };
  const corridorStatus: DashboardResponse["corridorStatus"] = corridor.length
    ? [
        ...corridor.map((section, index) => ({
          name: section.fromStation,
          state: stationState(
            [corridor[index - 1]?.sectionId, section.sectionId].filter(Boolean) as string[],
          ),
        })),
        {
          name: corridor[corridor.length - 1].toStation,
          state: stationState([corridor[corridor.length - 1].sectionId]),
        },
      ]
    : [];

  const impactLabels = ["Low Impact", "Medium Impact", "High Impact"] as const;
  const trainImpact = impactLabels.map((label) => {
    const level = label.replace(" Impact", "");
    const count = availableWindows.filter((window) => window.impact === level).length;
    return {
      name: label,
      value: availableWindows.length
        ? Math.round((count / availableWindows.length) * 100)
        : 0,
      color: impactColors[label],
    };
  });

  const alerts: DashboardResponse["alerts"] = [...defectAlerts];
  if (overdueTasks) {
    alerts.push({
      severity: "WARNING",
      title: `${overdueTasks} active maintenance task(s) overdue`,
      timestamp: `As of ${formatDateLabel(planningDate)}`,
    });
  }
  const unavailableWindows = windows.length - availableWindows.length;
  if (unavailableWindows) {
    alerts.push({
      severity: "INFO",
      title: `${unavailableWindows} block window(s) unavailable on the planning date`,
      timestamp: formatDateLabel(planningDate),
    });
  }

  return {
    planningDate,
    assetSummary: [
      { label: "Total Assets", value: String(assets.total), tone: "default" },
      {
        label: "High Priority Tasks",
        value: String(highPriorityTasks),
        supportText: `of ${tasks.length} active`,
        tone: "danger",
      },
      {
        label: "Available Windows",
        value: String(availableWindows.length),
        supportText: formatDateLabel(planningDate),
        tone: "warning",
      },
      {
        label: "Asset Availability",
        value: assets.total
          ? `${Math.round((assets.active / assets.total) * 100)}%`
          : "0%",
        supportText: `${assets.active} ACTIVE`,
        tone: "success",
      },
      {
        label: "Train Impact",
        value: highestImpact,
        supportText: `${trainOverlaps} overlaps`,
        tone: "default",
      },
    ],
    maintenanceTasks: tasks.slice(0, TOP_TASKS).map((task) => ({
      taskId: task.taskId,
      assetId: task.assetId,
      task: describeTask(task),
      department: task.department,
      priority: toPriorityLevel(task.priorityScore),
      riskScore: task.priorityScore,
      overdueDays: task.overdueDays,
    })),
    recommendedBlock: topWindow
      ? {
          blockId: topWindow.windowId,
          corridor: `${sectionLabels.get(topWindow.sectionId) ?? topWindow.sectionId} (${topWindow.sectionId})`,
          timeWindow: `${formatClock(topWindow.start)} – ${formatClock(topWindow.end)}`,
          durationHours: formatDuration(topWindow.durationMin),
          compatibleTasks: topWindow.candidateTaskIds.length,
          trainImpact: topWindow.impact,
          priorityCoverage: toPriorityCoverage(topWindow.topCandidateScore),
        }
      : null,
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
