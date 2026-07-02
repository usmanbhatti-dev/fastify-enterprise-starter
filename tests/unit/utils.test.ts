import { describe, it, expect } from 'vitest';
import {
  parsePagination,
  buildPaginationMeta,
  parseSort,
} from '../../src/utils/pagination.util.js';
import { parseDurationToSeconds } from '../../src/utils/date.util.js';
import { ValidationError, UnauthorizedError } from '../../src/exceptions/index.js';

describe('Pagination Utils', () => {
  it('should parse pagination with defaults', () => {
    const result = parsePagination();
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.skip).toBe(0);
  });

  it('should parse custom pagination', () => {
    const result = parsePagination(3, 50);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.skip).toBe(100);
  });

  it('should cap limit at max', () => {
    const result = parsePagination(1, 500);
    expect(result.limit).toBe(100);
  });

  it('should build pagination meta', () => {
    const meta = buildPaginationMeta(2, 10, 45);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPreviousPage).toBe(true);
  });
});

describe('Sort Utils', () => {
  it('should parse sort with defaults', () => {
    const result = parseSort();
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe('desc');
  });

  it('should parse custom sort', () => {
    const result = parseSort('email', 'asc', ['email', 'createdAt']);
    expect(result.sortBy).toBe('email');
    expect(result.sortOrder).toBe('asc');
  });
});

describe('Date Utils', () => {
  it('should parse duration to seconds', () => {
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToSeconds('1h')).toBe(3600);
    expect(parseDurationToSeconds('7d')).toBe(604800);
  });
});

describe('Custom Errors', () => {
  it('should create ValidationError with correct properties', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'email' });
  });

  it('should create UnauthorizedError', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });
});
