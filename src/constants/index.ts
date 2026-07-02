export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
} as const;

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
} as const;

export const REDIS_KEYS = {
  OTP: (purpose: string, identifier: string) => `otp:${purpose}:${identifier}`,
  RATE_LIMIT: (key: string) => `rate:${key}`,
  CACHE: (key: string) => `cache:${key}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
} as const;

export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
  IMAGE_PROCESSING: 'image-processing',
  DEAD_LETTER: 'dead-letter',
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  USER: 'user',
} as const;

export const OTP_EXPIRY_SECONDS = 600;
export const PASSWORD_RESET_EXPIRY_HOURS = 1;
export const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
