import type { DashboardData } from "../types/dashboard";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

function isDashboardData(value: unknown): value is DashboardData {
  if (typeof value !== "object" || value === null) return false;

  const dashboard = value as Partial<DashboardData>;
  return (
    typeof dashboard.planningDate === "string" &&
    Array.isArray(dashboard.assetSummary) &&
    Array.isArray(dashboard.maintenanceTasks) &&
    typeof dashboard.recommendedBlock === "object" &&
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

    return payload;
  } catch (error) {
    console.error("Unable to load dashboard data from the Node API:", error);
    throw new Error("Dashboard data is unavailable");
  }
}
