import { config } from "../config/env.js";
import { postJson } from "../integrations/python-service.client.js";
import type {
  PriorityPredictionInput,
  PriorityPredictionResponse,
} from "../types/python-services.js";

export function predictPriority(
  input: PriorityPredictionInput,
): Promise<PriorityPredictionResponse> {
  return postJson<PriorityPredictionInput, PriorityPredictionResponse>(
    config.mlServiceUrl,
    "/priority/predict",
    input,
  );
}