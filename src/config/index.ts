import { env } from './env.js';

export const appConfig = {
  name: env.APP_NAME,
  port: env.APP_PORT,
  host: env.APP_HOST,
  apiPrefix: env.API_PREFIX,
  nodeEnv: env.NODE_ENV,
} as const;

export const jwtConfig = {
  accessSecret: env.JWT_ACCESS_SECRET,
  refreshSecret: env.JWT_REFRESH_SECRET,
  accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
} as const;

export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  keyPrefix: env.REDIS_KEY_PREFIX,
  maxRetriesPerRequest: null as null,
  enableReadyCheck: false,
} as const;

export const securityConfig = {
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  rateLimitMax: env.RATE_LIMIT_MAX,
  rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
  argon2: {
    memoryCost: env.BCRYPT_MEMORY_COST,
    timeCost: env.BCRYPT_TIME_COST,
    parallelism: env.BCRYPT_PARALLELISM,
  },
} as const;

export const authRateLimitConfig = {
  max: env.AUTH_RATE_LIMIT_MAX,
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
} as const;

export const uploadConfig = {
  maxFileSizeMb: env.MAX_FILE_SIZE_MB,
  maxFileSizeBytes: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  uploadDir: env.UPLOAD_DIR,
} as const;

export const storageConfig = {
  driver: env.STORAGE_DRIVER,
  s3: {
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    endpoint: env.S3_ENDPOINT,
    publicUrl: env.S3_PUBLIC_URL,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  },
} as const;

export const smtpConfig = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  user: env.SMTP_USER,
  password: env.SMTP_PASSWORD,
  from: env.SMTP_FROM,
} as const;

export const otelConfig = {
  enabled: env.OTEL_ENABLED,
  serviceName: env.OTEL_SERVICE_NAME,
  exporterEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
} as const;

export const logConfig = {
  level: env.LOG_LEVEL,
  pretty: env.NODE_ENV === 'development',
} as const;
