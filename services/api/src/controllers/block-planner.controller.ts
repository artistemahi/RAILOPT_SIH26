import type { Request, Response } from "express";
import {
  getBlockPlannerData,
  type BlockPlannerResponse,
} from "../services/block-planner.service.js";

export async function getBlockPlanner(
  _request: Request,
  response: Response<BlockPlannerResponse | { error: string }>,
): Promise<void> {
  try {
    const planner = await getBlockPlannerData();
    response.status(200).json(planner);
  } catch (error) {
    console.error("Block planner query failed:", error);
    response.status(500).json({ error: "Failed to load block planner data" });
  }
}
