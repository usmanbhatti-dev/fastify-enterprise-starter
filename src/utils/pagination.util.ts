import { DEFAULT_PAGINATION } from '../constants/index.js';
import type {
  PaginationParams,
  SortParams,
  FilterParams,
  CursorPaginationParams,
} from '../types/index.js';

export interface ParsedPagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(page?: number | string, limit?: number | string): ParsedPagination {
  const parsedPage = Math.max(1, Number(page) || DEFAULT_PAGINATION.PAGE);
  const parsedLimit = Math.min(
    DEFAULT_PAGINATION.MAX_LIMIT,
    Math.max(1, Number(limit) || DEFAULT_PAGINATION.LIMIT),
  );

  return {
    page: parsedPage,
    limit: parsedLimit,
    skip: (parsedPage - 1) * parsedLimit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
} {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function parseSort(
  sortBy?: string,
  sortOrder?: string,
  allowedFields: string[] = ['createdAt'],
  defaultField = 'createdAt',
): SortParams {
  const field = sortBy && allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order = sortOrder === 'asc' ? 'asc' : 'desc';

  return { sortBy: field, sortOrder: order };
}

export function parseFilters(query: Record<string, unknown>): FilterParams {
  const { search, ...rest } = query;
  const filters: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith('filter_') && value !== undefined && value !== '') {
      const filterKey = key.replace('filter_', '');
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        filters[filterKey] = value;
      }
    }
  }

  return {
    search: typeof search === 'string' ? search : undefined,
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  };
}

export function parseCursorPagination(
  cursor?: string,
  limit?: number | string,
): CursorPaginationParams {
  return {
    cursor: cursor || undefined,
    limit: Math.min(
      DEFAULT_PAGINATION.MAX_LIMIT,
      Math.max(1, Number(limit) || DEFAULT_PAGINATION.LIMIT),
    ),
  };
}

export function buildSearchCondition(
  search: string | undefined,
  fields: string[],
): Record<string, unknown> | undefined {
  if (!search || fields.length === 0) return undefined;

  return {
    OR: fields.map((field) => ({
      [field]: { contains: search, mode: 'insensitive' },
    })),
  };
}

export function toPaginationParams(parsed: ParsedPagination): PaginationParams {
  return { page: parsed.page, limit: parsed.limit };
}
