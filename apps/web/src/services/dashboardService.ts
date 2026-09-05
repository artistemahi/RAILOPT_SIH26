import { dashboardMockData } from "./mock/dashboardData";
import type { DashboardData } from "../types/dashboard";

export async function getDashboardData(): Promise<DashboardData> {
  return dashboardMockData;
}
