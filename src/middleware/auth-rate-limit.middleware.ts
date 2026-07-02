import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Redis } from 'ioredis';
import { RateLimitError } from '../exceptions/index.js';
import { authRateLimitConfig } from '../config/index.js';

export type AuthRateLimitAction =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'refresh'
  | 'resend-verification'
  | 'reset-password'
  | 'verify-email';

function buildRateLimitKey(action: AuthRateLimitAction, request: FastifyRequest): string {
  const body = request.body as { email?: string; token?: string } | undefined;
  const identifier = body?.email?.toLowerCase() ?? (body?.token ? 'token' : 'unknown');
  return `auth:${action}:${identifier}:${request.ip}`;
}

export function createAuthRateLimiter(redis: Redis, action: AuthRateLimitAction) {
  return async function authRateLimit(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const key = buildRateLimitKey(action, request);
    const windowSeconds = Math.ceil(authRateLimitConfig.windowMs / 1000);

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    if (count > authRateLimitConfig.max) {
      throw new RateLimitError(`Too many ${action} attempts. Please try again later.`);
    }
  };
}
