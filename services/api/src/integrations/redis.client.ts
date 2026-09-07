import { createClient, type RedisClientType } from "redis";
import { config } from "../config/env.js";

const redisClient: RedisClientType = createClient({
  url: config.redisUrl,
  socket: {
    connectTimeout: 1000,
    reconnectStrategy: false,
  },
});

redisClient.on("error", () => {
  // Redis is optional; callers fall back to PostgreSQL when it is unavailable.
});

let connectionAttempt: Promise<boolean> | null = null;

async function ensureRedisConnection(): Promise<boolean> {
  if (redisClient.isReady) return true;
  if (connectionAttempt) return connectionAttempt;

  connectionAttempt = redisClient
    .connect()
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      connectionAttempt = null;
    });

  return connectionAttempt;
}

export async function redisGet(key: string): Promise<string | null> {
  try {
    if (!(await ensureRedisConnection())) return null;
    return await redisClient.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  try {
    if (!(await ensureRedisConnection())) return false;
    await redisClient.set(key, value, { EX: ttlSeconds });
    return true;
  } catch {
    return false;
  }
}

export async function redisTest(): Promise<{
  available: boolean;
  value: string | null;
}> {
  const key = `railopt:redis-test:${Date.now()}`;
  const value = "ok";
  if (!(await redisSet(key, value, 30))) {
    return { available: false, value: null };
  }

  const storedValue = await redisGet(key);
  return { available: storedValue === value, value: storedValue };
}
