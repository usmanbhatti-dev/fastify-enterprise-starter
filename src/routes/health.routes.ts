import type { FastifyInstance } from 'fastify';
import { checkDatabaseHealth } from '../database/index.js';
import { checkRedisHealth } from '../cache/index.js';
import { successResponse } from '../utils/response.util.js';
import { HTTP_STATUS } from '../constants/index.js';

export function healthRoutes(app: FastifyInstance): void {
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'Liveness probe',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
      },
    },
    handler: async (_request, reply) => {
      void reply.send(
        successResponse(
          {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
          },
          'Service is healthy',
        ),
      );
    },
  });

  app.get('/ready', {
    schema: {
      tags: ['Health'],
      summary: 'Readiness probe',
    },
    handler: async (_request, reply) => {
      const [dbHealthy, redisHealthy] = await Promise.all([
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      const isReady = dbHealthy && redisHealthy;

      const data = {
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealthy ? 'up' : 'down',
          redis: redisHealthy ? 'up' : 'down',
        },
      };

      if (!isReady) {
        void reply.status(HTTP_STATUS.SERVICE_UNAVAILABLE).send({
          success: false,
          message: 'Service is not ready',
          data,
        });
        return;
      }

      void reply.send(successResponse(data, 'Service is ready'));
    },
  });
}
