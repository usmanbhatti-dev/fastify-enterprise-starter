import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { connectDatabase, prisma } from '../../src/database/index.js';
import { connectRedis } from '../../src/cache/index.js';
import { appConfig } from '../../src/config/index.js';
import { teardownTestApp } from '../helpers/teardown.js';

describe('Auth Endpoints', () => {
  let app: FastifyInstance;
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test@123456';
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    await connectDatabase();
    await connectRedis();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  it('POST /auth/register should create a new user without tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/register`,
      payload: {
        email: testEmail,
        password: testPassword,
        firstName: 'Test',
        lastName: 'User',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.user.email).toBe(testEmail);
    expect(body.data.tokens).toBeUndefined();
  });

  it('POST /auth/login should reject unverified user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/login`,
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('POST /auth/login should authenticate verified user', async () => {
    await prisma.user.update({
      where: { email: testEmail },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    });

    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/login`,
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.tokens).toHaveProperty('accessToken');

    accessToken = body.data.tokens.accessToken;
    refreshToken = body.data.tokens.refreshToken;
  });

  it('POST /auth/refresh should refresh tokens', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/refresh`,
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('accessToken');
    expect(body.data).toHaveProperty('refreshToken');

    accessToken = body.data.accessToken;
    refreshToken = body.data.refreshToken;
  });

  it('GET /users/me should return current user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `${appConfig.apiPrefix}/users/me`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
  });

  it('POST /auth/logout should invalidate session', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/logout`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: { refreshToken },
    });

    expect(response.statusCode).toBe(200);

    const meResponse = await app.inject({
      method: 'GET',
      url: `${appConfig.apiPrefix}/users/me`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(meResponse.statusCode).toBe(401);
  });

  it('POST /auth/register should reject duplicate email', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/register`,
      payload: {
        email: testEmail,
        password: testPassword,
      },
    });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });

  it('POST /auth/login should reject invalid credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: `${appConfig.apiPrefix}/auth/login`,
      payload: {
        email: testEmail,
        password: 'WrongPassword@123',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
  });
});
