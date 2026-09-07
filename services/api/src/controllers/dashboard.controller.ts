import type { Request, Response } from "express";
import {
  getDashboardData,
  type DashboardResponse,
} from "../services/dashboard.service.js";

export async function getDashboard(
  _request: Request,
  response: Response<DashboardResponse | { error: string }>,
): Promise<void> {
  try {
    const dashboard = await getDashboardData();
    response.status(200).json(dashboard);
  } catch (error) {
    console.error("Dashboard query failed:", error);
    response.status(500).json({ error: "Failed to load dashboard data" });
  }
}
