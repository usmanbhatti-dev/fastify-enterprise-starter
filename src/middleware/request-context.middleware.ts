import type { FastifyReply, FastifyRequest } from 'fastify';
import { nanoid } from 'nanoid';

export async function requestContextMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  request.requestId = (request.headers['x-request-id'] as string) || nanoid();
  request.correlationId = (request.headers['x-correlation-id'] as string) || request.requestId;
}

export async function responseHeadersMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  reply.header('X-Request-Id', request.requestId);
  reply.header('X-Correlation-Id', request.correlationId);
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.removeHeader('X-Powered-By');
}
