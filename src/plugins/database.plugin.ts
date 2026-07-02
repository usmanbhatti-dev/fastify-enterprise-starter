import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { prisma } from '../database/index.js';
import { getRedisClient } from '../cache/index.js';
import type { AppDependencies } from '../interfaces/index.js';

async function databasePlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
}

export default fp(databasePlugin, {
  name: 'database-plugin',
});

export async function dependenciesPlugin(
  fastify: FastifyInstance,
  dependencies: AppDependencies,
): Promise<void> {
  fastify.decorate('redis', getRedisClient());
  fastify.decorate('dependencies', dependencies);

  fastify.addHook('onClose', async () => {
    await dependencies.queue.close();
    await dependencies.redis.quit();
  });
}

export const dependenciesPluginWrapped = fp(
  async (fastify: FastifyInstance, opts: { dependencies: AppDependencies }) => {
    await dependenciesPlugin(fastify, opts.dependencies);
  },
  { name: 'dependencies-plugin' },
);
