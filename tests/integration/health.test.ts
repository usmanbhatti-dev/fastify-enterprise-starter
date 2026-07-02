import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { connectDatabase } from '../../src/database/index.js';
import { connectRedis } from '../../src/cache/index.js';
import { teardownTestApp } from '../helpers/teardown.js';

describe('Health Endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await teardownTestApp(app);
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
