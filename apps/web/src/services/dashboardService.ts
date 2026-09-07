import type { DashboardData } from "../types/dashboard";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

function isDashboardData(value: unknown): value is DashboardData {
  if (typeof value !== "object" || value === null) return false;

  const dashboard = value as Partial<DashboardData>;
  return (
    Array.isArray(dashboard.assetSummary) &&
    Array.isArray(dashboard.maintenanceTasks) &&
    typeof dashboard.recommendedBlock === "object" &&
    dashboard.recommendedBlock !== null &&
    Array.isArray(dashboard.corridorStatus) &&
    Array.isArray(dashboard.trainImpact) &&
    Array.isArray(dashboard.alerts)
  );
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/api/dashboard`,
    );

    if (!response.ok) {
      throw new Error(`Dashboard API returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isDashboardData(payload)) {
      throw new Error("Dashboard API returned an invalid response");
    }

    return {
      assetSummary: payload.assetSummary.map((item) => ({ ...item })),
      maintenanceTasks: payload.maintenanceTasks.map((task) => ({ ...task })),
      recommendedBlock: { ...payload.recommendedBlock },
      corridorStatus: payload.corridorStatus.map((status) => ({ ...status })),
      trainImpact: payload.trainImpact.map((impact) => ({ ...impact })),
      alerts: payload.alerts.map((alert) => ({ ...alert })),
    };
  } catch (error) {
    console.error("Unable to load dashboard data from the Node API:", error);
    throw new Error("Dashboard data is unavailable");
  }
}
