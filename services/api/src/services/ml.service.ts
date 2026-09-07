import { config } from "../config/env.js";
import { postJson } from "../integrations/python-service.client.js";
import type {
  MlPredictionInput,
  MlPredictionResponse,
} from "../types/python-services.js";

export function predictDelay(
  input: MlPredictionInput,
): Promise<MlPredictionResponse> {
  return postJson<MlPredictionInput, MlPredictionResponse>(
    config.mlServiceUrl,
    "/predict",
    input,
  );
}
