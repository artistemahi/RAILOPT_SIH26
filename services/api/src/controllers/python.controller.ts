import type { Request, Response } from "express";
import { PythonServiceError } from "../integrations/python-service.client.js";
import { optimizeTrains } from "../services/optimizer.service.js";
import type {
  OptimizeRequest,
} from "../types/python-services.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendPythonError(
  response: Response,
  error: unknown,
  message: string,
): void {
  if (error instanceof PythonServiceError) {
    response.status(error.statusCode).json({ error: message });
    return;
  }

  console.error(message, error);
  response.status(500).json({ error: message });
}

export async function optimize(
  request: Request,
  response: Response,
): Promise<void> {
  if (!isRecord(request.body) || !Array.isArray(request.body.trains)) {
    response
      .status(422)
      .json({ error: "Optimizer input must include a trains array" });
    return;
  }

  try {
    const result = await optimizeTrains(
      request.body as unknown as OptimizeRequest,
    );

    response.status(200).json(result);
  } catch (error) {
    sendPythonError(response, error, "Optimizer service failed");
  }
}