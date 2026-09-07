import type { Request, Response } from "express";
import { redisTest } from "../integrations/redis.client.js";

export async function testRedis(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    const result = await redisTest();
    response.status(result.available ? 200 : 503).json({
      redis: result.available ? "ok" : "unavailable",
      ...result,
    });
  } catch (error) {
    console.error("Redis test failed:", error);
    response.status(503).json({
      redis: "unavailable",
      available: false,
      value: null,
    });
  }
}
