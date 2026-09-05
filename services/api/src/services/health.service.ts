import type { HealthResponse } from "../types/api.js";

export function getHealthStatus(service: string): HealthResponse {
  return {
    service: "railopt-" + service,
    status: "ok"
  };
}
