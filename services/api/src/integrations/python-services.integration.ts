import { config } from "../config/env.js";
import type { PythonServiceDirectory } from "../types/api.js";

export function getPythonServiceDirectory(): PythonServiceDirectory {
  return {
    ml: { baseUrl: config.mlServiceUrl },
    optimizer: { baseUrl: config.optimizerServiceUrl }
  };
}
