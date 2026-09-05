import dotenv from "dotenv";
import type { ApiConfig } from "../types/config.js";

dotenv.config();

export const config: Readonly<ApiConfig> = Object.freeze({
  port: Number(process.env.PORT || 5000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8001",
  optimizerServiceUrl: process.env.OPTIMIZER_SERVICE_URL || "http://localhost:8002"
});
