import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  requestContextMiddleware,
  responseHeadersMiddleware,
} from '../middleware/request-context.middleware.js';
import { sanitizeObject } from '../utils/async.util.js';

async function loggingPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', requestContextMiddleware);
  fastify.addHook('onRequest', responseHeadersMiddleware);

  fastify.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    request.log.info(
      {
        requestId: request.requestId,
        correlationId: request.correlationId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
        userId: request.user?.id,
      },
      'Request completed',
    );
    done();
  });

  fastify.addHook('preHandler', (request: FastifyRequest, _reply, done) => {
    if (request.body && typeof request.body === 'object') {
      request.log.debug(
        {
          requestId: request.requestId,
          body: sanitizeObject(request.body as Record<string, unknown>),
        },
        'Request body',
      );
    }
    done();
  });
}

export default fp(loggingPlugin, {
  name: 'logging-plugin',
});
