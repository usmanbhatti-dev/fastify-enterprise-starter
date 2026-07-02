import type { ApiResponse, ResponseMeta } from '../types/index.js';

export function successResponse<T>(
  data: T,
  message = 'Success',
  meta?: ResponseMeta,
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    ...(meta && { meta }),
  };
}

export function errorResponse(message: string, code?: string): ApiResponse<null> {
  return {
    success: false,
    message,
    data: null,
    ...(code && { meta: { code } as ResponseMeta }),
  };
}

export function createdResponse<T>(data: T, message = 'Created successfully'): ApiResponse<T> {
  return successResponse(data, message);
}

export function noContentResponse(): ApiResponse<null> {
  return {
    success: true,
    message: 'No content',
    data: null,
  };
}

export function paginatedResponse<T>(
  data: T[],
  meta: Required<
    Pick<
      ResponseMeta,
      'page' | 'limit' | 'total' | 'totalPages' | 'hasNextPage' | 'hasPreviousPage'
    >
  >,
  message = 'Success',
): ApiResponse<T[]> {
  return successResponse(data, message, meta);
}

export function cursorPaginatedResponse<T>(
  data: T[],
  nextCursor: string | null,
  limit: number,
  message = 'Success',
): ApiResponse<T[]> {
  return successResponse(data, message, {
    cursor: null,
    nextCursor,
    limit,
    hasNextPage: nextCursor !== null,
  });
}
