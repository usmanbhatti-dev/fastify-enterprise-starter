import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import type { FastifyInstance } from 'fastify';
import type { Redis } from 'ioredis';
import { securityConfig, uploadConfig } from '../config/index.js';

async function securityPlugin(fastify: FastifyInstance, opts: { redis?: Redis }): Promise<void> {
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });

  await fastify.register(cors, {
    origin: securityConfig.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'X-Correlation-Id',
      'X-Device-Name',
      'X-Device-Type',
    ],
  });

  await fastify.register(rateLimit, {
    max: securityConfig.rateLimitMax,
    timeWindow: securityConfig.rateLimitWindowMs,
    ...(opts.redis && {
      redis: opts.redis,
      nameSpace: 'rate-limit:',
    }),
    keyGenerator: (request) => {
      return request.user?.id ?? request.ip;
    },
    errorResponseBuilder: (_request, context) => ({
      success: false,
      message: 'Too many requests',
      data: null,
      meta: {
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: context.after,
      },
    }),
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: uploadConfig.maxFileSizeBytes,
      files: 5,
    },
  });
}

export default fp(securityPlugin, {
  name: 'security-plugin',
});
