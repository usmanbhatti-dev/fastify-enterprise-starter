import type { FastifyReply, FastifyRequest } from 'fastify';
import { getRandomValues } from 'node:crypto';

type AsyncRouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;

export function asyncHandler(handler: AsyncRouteHandler): AsyncRouteHandler {
  return async (request, reply) => {
    return handler(request, reply);
  };
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveKeys: string[] = ['password', 'passwordHash', 'token', 'refreshToken', 'secret'],
): Partial<T> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>, sensitiveKeys);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as Partial<T>;
}

export function generateSecureToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result as Omit<T, K>;
}
