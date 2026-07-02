import type { Redis } from 'ioredis';
import type { IOtpService } from '../../interfaces/index.js';
import { REDIS_KEYS, OTP_EXPIRY_SECONDS } from '../../constants/index.js';

export class OtpService implements IOtpService {
  constructor(private readonly redis: Redis) {}

  async generate(purpose: string, identifier: string, length = 6): Promise<string> {
    const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
    const key = REDIS_KEYS.OTP(purpose, identifier);

    await this.redis.setex(key, OTP_EXPIRY_SECONDS, code);

    return code;
  }

  async verify(purpose: string, identifier: string, code: string): Promise<boolean> {
    const key = REDIS_KEYS.OTP(purpose, identifier);
    const stored = await this.redis.get(key);

    if (!stored || stored !== code) {
      return false;
    }

    await this.redis.del(key);
    return true;
  }

  async delete(purpose: string, identifier: string): Promise<void> {
    const key = REDIS_KEYS.OTP(purpose, identifier);
    await this.redis.del(key);
  }
}
