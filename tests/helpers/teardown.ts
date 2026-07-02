import type { FastifyInstance } from 'fastify';
import { disconnectDatabase } from '../../src/database/index.js';
import { disconnectRedis } from '../../src/cache/index.js';

export async function teardownTestApp(app?: FastifyInstance): Promise<void> {
  if (app) {
    await app.close();
  }

  await disconnectDatabase().catch(() => undefined);
  await disconnectRedis();
}
