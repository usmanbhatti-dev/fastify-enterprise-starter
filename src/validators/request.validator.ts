import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../exceptions/index.js';

type RequestPart = 'body' | 'query' | 'params' | 'headers';

export function validateRequest<T>(schema: ZodSchema<T>, part: RequestPart = 'body') {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    try {
      const data = request[part];
      const parsed = await schema.parseAsync(data);
      Object.assign(request, { [part]: parsed });
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.reduce(
          (acc, err) => {
            const path = err.path.join('.');
            acc[path] = err.message;
            return acc;
          },
          {} as Record<string, string>,
        );
        throw new ValidationError('Request validation failed', { errors: details });
      }
      throw error;
    }
  };
}

export function validateResponse<T>(schema: ZodSchema<T>) {
  return (data: unknown): T => {
    return schema.parse(data);
  };
}
