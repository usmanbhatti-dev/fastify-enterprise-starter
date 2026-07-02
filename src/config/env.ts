import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_NAME: z.string().default('fastify-enterprise-starter'),
  APP_PORT: z.coerce.number().int().positive().default(3000),
  APP_HOST: z.string().default('0.0.0.0'),
  API_PREFIX: z.string().default('/api/v1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().int().min(0).default(0),
  REDIS_KEY_PREFIX: z.string().default('app:'),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),

  BCRYPT_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  BCRYPT_TIME_COST: z.coerce.number().int().positive().default(3),
  BCRYPT_PARALLELISM: z.coerce.number().int().positive().default(4),

  SMTP_HOST: z.string().optional().default('smtp.example.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  SMTP_FROM: z.string().email().optional().default('noreply@example.com'),

  OTEL_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  OTEL_SERVICE_NAME: z.string().default('fastify-enterprise-starter'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),

  MAX_FILE_SIZE_MB: z.coerce.number().int().positive().default(10),
  UPLOAD_DIR: z.string().default('./uploads'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional().default(''),
  S3_REGION: z.string().optional().default('us-east-1'),
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return result.data;
}

const parsedEnv = parseEnv();

function validateProductionSecrets(config: EnvConfig): void {
  if (config.NODE_ENV !== 'production') {
    return;
  }

  const insecurePatterns = ['change-me', 'test-access', 'test-refresh'];
  const secrets = [config.JWT_ACCESS_SECRET, config.JWT_REFRESH_SECRET];

  for (const secret of secrets) {
    if (insecurePatterns.some((pattern) => secret.toLowerCase().includes(pattern))) {
      throw new Error(
        'Production startup blocked: set strong JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (32+ chars).',
      );
    }
  }
}

validateProductionSecrets(parsedEnv);

export const env = parsedEnv;

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

export const corsOrigins = env.CORS_ORIGIN.split(',').map((origin) => origin.trim());
