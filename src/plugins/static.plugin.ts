import fp from 'fastify-plugin';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';
import { join } from 'node:path';
import { storageConfig, uploadConfig } from '../config/index.js';

async function staticFilesPlugin(fastify: FastifyInstance): Promise<void> {
  if (storageConfig.driver !== 'local') {
    return;
  }

  await fastify.register(fastifyStatic, {
    root: join(process.cwd(), uploadConfig.uploadDir),
    prefix: '/uploads/',
    decorateReply: false,
  });
}

export default fp(staticFilesPlugin, {
  name: 'static-files-plugin',
});
