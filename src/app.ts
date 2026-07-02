import 'dotenv/config';

import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { appConfig, logConfig } from './config/index.js';
import { isProduction } from './config/env.js';
import { globalErrorHandler } from './middleware/error.middleware.js';
import { createContainer } from './common/container.js';
import { registerRoutes } from './routes/index.js';
import { registerJobProcessors } from './jobs/index.js';
import { connectDatabase } from './database/index.js';
import { connectRedis } from './cache/index.js';

import databasePlugin, { dependenciesPluginWrapped } from './plugins/database.plugin.js';
import securityPlugin from './plugins/security.plugin.js';
import swaggerPlugin from './plugins/swagger.plugin.js';
import loggingPlugin from './plugins/logging.plugin.js';
import staticFilesPlugin from './plugins/static.plugin.js';
import { storageConfig } from './config/index.js';

export async function buildApp(): Promise<FastifyInstance> {
  const container = createContainer();

  const app = Fastify({
    logger: {
      level: logConfig.level,
      ...(logConfig.pretty && {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }),
    },
    trustProxy: true,
    requestIdHeader: 'x-request-id',
    genReqId: () => randomUUID(),
  });

  app.setErrorHandler(globalErrorHandler);

  await app.register(loggingPlugin);
  await app.register(databasePlugin);
  await app.register(dependenciesPluginWrapped, { dependencies: container.dependencies });
  await app.register(securityPlugin, { redis: container.dependencies.redis });

  if (!isProduction) {
    await app.register(swaggerPlugin);
  }

  if (storageConfig.driver === 'local') {
    await app.register(staticFilesPlugin);
  }

  await registerRoutes(app, container);

  registerJobProcessors(container.queueService, container.emailService, app.log);

  app.decorate('container', container);

  return app;
}

export async function startApp(): Promise<FastifyInstance> {
  await connectDatabase();
  await connectRedis();

  const app = await buildApp();

  await app.listen({
    port: appConfig.port,
    host: appConfig.host,
  });

  app.log.info(`Server listening on ${appConfig.host}:${appConfig.port}`);
  if (!isProduction) {
    app.log.info(`API documentation available at http://localhost:${appConfig.port}/docs`);
  }

  return app;
}
