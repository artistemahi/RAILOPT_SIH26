import type { Request, Response } from "express";
import { PythonServiceError } from "../integrations/python-service.client.js";
import {
  generateBlockPlan,
  getWhatIfOptions,
  runWhatIf,
  type WhatIfChange,
} from "../services/block-plan.service.js";
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

export async function whatIfOptions(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    response.status(200).json(await getWhatIfOptions());
  } catch (error) {
    console.error("What-if options failed:", error);
    response.status(500).json({ error: "Failed to load what-if options" });
  }
}

export async function whatIf(request: Request, response: Response): Promise<void> {
  const changes: unknown = request.body?.changes;
  if (!Array.isArray(changes)) {
    response.status(422).json({ error: "Body must include a changes array" });
    return;
  }

  try {
    response.status(200).json(await runWhatIf(changes as WhatIfChange[]));
  } catch (error) {
    if (error instanceof PythonServiceError && error.statusCode === 422) {
      response.status(422).json({ error: error.detail ?? "Invalid scenario" });
      return;
    }
    console.error("What-if simulation failed:", error);
    const status = error instanceof PythonServiceError ? error.statusCode : 500;
    response.status(status).json({ error: "What-if simulation failed" });
  }
}
