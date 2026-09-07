import type { Request, Response } from "express";
import { getRiskData, type RiskResponse } from "../services/risk.service.js";

export async function getRisk(
  _request: Request,
  response: Response<RiskResponse | { error: string }>,
): Promise<void> {
  try {
    const risk = await getRiskData();
    response.status(200).json(risk);
  } catch (error) {
    console.error("Risk query failed:", error);
    response.status(500).json({ error: "Failed to load risk data" });
  }
}
