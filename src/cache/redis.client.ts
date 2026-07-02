import { Redis } from 'ioredis';
import { redisConfig } from '../config/index.js';

let redisInstance: Redis | null = null;

export function createRedisClient(): Redis {
  if (redisInstance) return redisInstance;

  redisInstance = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    keyPrefix: redisConfig.keyPrefix,
    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
    enableReadyCheck: redisConfig.enableReadyCheck,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > 10) return null;
      return Math.min(times * 100, 3000);
    },
  });

  redisInstance.on('error', (err: Error) => {
    console.error('Redis connection error:', err.message);
  });

  return redisInstance;
}

export function getRedisClient(): Redis {
  return createRedisClient();
}

export async function connectRedis(): Promise<void> {
  const client = createRedisClient();
  if (client.status !== 'ready') {
    await client.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}

export type { Redis };
