import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/index.js';
import { connectRedis, disconnectRedis } from '../src/cache/index.js';

describe('Health Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
    await disconnectRedis();
  });

  it('GET /health should return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
  });

  it('GET /ready should return readiness status', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect([200, 503]).toContain(response.statusCode);
    const body = JSON.parse(response.body);
    expect(body.data).toHaveProperty('checks');
    expect(body.data.checks).toHaveProperty('database');
    expect(body.data.checks).toHaveProperty('redis');
  });
});
