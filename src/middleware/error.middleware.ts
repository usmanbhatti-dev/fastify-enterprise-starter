import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { isAppError, InternalServerError } from '../exceptions/index.js';
import { isProduction } from '../config/env.js';
import { sanitizeObject } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/index.js';

export function globalErrorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const requestId = request.requestId;
  const correlationId = request.correlationId;

  if (isAppError(error)) {
    request.log.warn(
      {
        err: sanitizeObject({ message: error.message, code: error.code, details: error.details }),
        requestId,
        correlationId,
      },
      'Operational error',
    );

    void reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      data: null,
      meta: {
        code: error.code,
        ...(error.details && { details: error.details }),
        requestId,
        correlationId,
      },
    });
    return;
  }

  if (error.validation) {
    void reply.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).send({
      success: false,
      message: 'Validation failed',
      data: null,
      meta: {
        code: 'VALIDATION_ERROR',
        details: error.validation,
        requestId,
        correlationId,
      },
    });
    return;
  }

  request.log.error(
    {
      err: error,
      requestId,
      correlationId,
      stack: isProduction ? undefined : error.stack,
    },
    'Unhandled error',
  );

  const internalError = new InternalServerError(
    isProduction ? 'An unexpected error occurred' : error.message,
  );

  void reply.status(internalError.statusCode).send({
    success: false,
    message: internalError.message,
    data: null,
    meta: {
      code: internalError.code,
      requestId,
      correlationId,
    },
  });
}
