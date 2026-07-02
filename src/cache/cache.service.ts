import type { Redis } from 'ioredis';
import type { ICacheService } from '../interfaces/index.js';
import { REDIS_KEYS } from '../constants/index.js';

export class CacheService implements ICacheService {
  constructor(private readonly redis: Redis) {}

  private buildKey(key: string): string {
    return REDIS_KEYS.CACHE(key);
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(this.buildKey(key));
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const cacheKey = this.buildKey(key);

    if (ttlSeconds) {
      await this.redis.setex(cacheKey, ttlSeconds, serialized);
    } else {
      await this.redis.set(cacheKey, serialized);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.buildKey(key));
  }

  async delPattern(pattern: string): Promise<void> {
    const fullPattern = this.buildKey(pattern);
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(this.buildKey(key));
    return result === 1;
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    const cacheKey = this.buildKey(key);
    const result = await this.redis.incr(cacheKey);

    if (ttlSeconds && result === 1) {
      await this.redis.expire(cacheKey, ttlSeconds);
    }

    return result;
  }
}
