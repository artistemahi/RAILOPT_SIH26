import { config } from "../config/env.js";
import { postJson } from "../integrations/python-service.client.js";
import type {
  OptimizeRequest,
  OptimizeResponse,
} from "../types/python-services.js";

export function optimizeTrains(
  input: OptimizeRequest,
): Promise<OptimizeResponse> {
  return postJson<OptimizeRequest, OptimizeResponse>(
    config.optimizerServiceUrl,
    "/optimize",
    input,
  );
}
