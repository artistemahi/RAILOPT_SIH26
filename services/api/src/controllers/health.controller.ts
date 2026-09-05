import type { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service.js";
import type { HealthResponse } from "../types/api.js";

export function getHealth(_request: Request, response: Response<HealthResponse>): void {
  response.status(200).json(getHealthStatus("api"));
}
