import type { Request, Response } from "express";
import { config } from "../config/env.js";
import { testObjectStorage } from "../integrations/object-storage.service.js";

export async function testMinio(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const result = await testObjectStorage();
    response.status(result.available ? 200 : 503).json({
      minio: result.available ? "ok" : "unavailable",
      ...result,
    });
  } catch (error) {
    console.error("MinIO test failed:", error);
    response.status(503).json({
      minio: "unavailable",
      available: false,
      bucket: config.minioBucket,
      objectKey: "health/minio-test.txt",
      retrievedValue: null,
    });
  }
}
