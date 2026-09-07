import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import type { ApiConfig } from "../types/config.js";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
});

export const config: Readonly<ApiConfig> = Object.freeze({
  port: Number(process.env.PORT || 5000),
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "",
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:8001",
  optimizerServiceUrl:
    process.env.OPTIMIZER_SERVICE_URL || "http://localhost:8002",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  dashboardCacheTtlSeconds: Number(
    process.env.DASHBOARD_CACHE_TTL_SECONDS || 45,
  ),
  minioEndpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  minioAccessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  minioSecretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
  minioBucket: process.env.MINIO_BUCKET || "railopt",
  minioRegion: process.env.MINIO_REGION || "us-east-1",
});
