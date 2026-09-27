import type { Request, Response } from "express";
import { PythonServiceError } from "../integrations/python-service.client.js";
import { generateBlockPlan } from "../services/block-plan.service.js";
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

export async function planBlocks(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    response.status(200).json(await generateBlockPlan());
  } catch (error) {
    console.error("Block planning failed:", error);
    const status = error instanceof PythonServiceError ? error.statusCode : 500;
    response.status(status).json({ error: "Block planning failed" });
  }
}
