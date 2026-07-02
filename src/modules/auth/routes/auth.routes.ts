import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AuthController } from '../controllers/auth.controller.js';
import type { Redis } from 'ioredis';
import { validateRequest } from '../../../validators/index.js';
import { createAuthRateLimiter } from '../../../middleware/auth-rate-limit.middleware.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  logoutSchema,
  resendVerificationSchema,
} from '../validators/auth.validator.js';

export function authRoutes(
  app: FastifyInstance,
  controller: AuthController,
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  redis: Redis,
): void {
  const rateLimitLogin = createAuthRateLimiter(redis, 'login');
  const rateLimitRegister = createAuthRateLimiter(redis, 'register');
  const rateLimitForgotPassword = createAuthRateLimiter(redis, 'forgot-password');
  const rateLimitRefresh = createAuthRateLimiter(redis, 'refresh');
  const rateLimitResendVerification = createAuthRateLimiter(redis, 'resend-verification');
  const rateLimitResetPassword = createAuthRateLimiter(redis, 'reset-password');
  const rateLimitVerifyEmail = createAuthRateLimiter(redis, 'verify-email');

  app.post('/register', {
    preHandler: [rateLimitRegister, validateRequest(registerSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Register a new user',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
    },
    handler: controller.register,
  });

  app.post('/login', {
    preHandler: [rateLimitLogin, validateRequest(loginSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Login with email and password',
    },
    handler: controller.login,
  });

  app.post('/refresh', {
    preHandler: [rateLimitRefresh, validateRequest(refreshTokenSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Refresh access token',
    },
    handler: controller.refreshToken,
  });

  app.post('/logout', {
    preHandler: [authenticate, validateRequest(logoutSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Logout current session',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.logout,
  });

  app.post('/forgot-password', {
    preHandler: [rateLimitForgotPassword, validateRequest(forgotPasswordSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Request password reset',
    },
    handler: controller.forgotPassword,
  });

  app.post('/reset-password', {
    preHandler: [rateLimitResetPassword, validateRequest(resetPasswordSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Reset password with token',
    },
    handler: controller.resetPassword,
  });

  app.post('/change-password', {
    preHandler: [authenticate, validateRequest(changePasswordSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Change password',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.changePassword,
  });

  app.post('/verify-email', {
    preHandler: [rateLimitVerifyEmail, validateRequest(verifyEmailSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Verify email address',
    },
    handler: controller.verifyEmail,
  });

  app.post('/resend-verification', {
    preHandler: [rateLimitResendVerification, validateRequest(resendVerificationSchema, 'body')],
    schema: {
      tags: ['Auth'],
      summary: 'Resend email verification (public, by email)',
    },
    handler: controller.resendVerificationByEmail,
  });

  app.post('/resend-verification/me', {
    preHandler: authenticate,
    schema: {
      tags: ['Auth'],
      summary: 'Resend email verification for authenticated user',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.resendVerification,
  });

  app.get('/sessions', {
    preHandler: authenticate,
    schema: {
      tags: ['Auth'],
      summary: 'List active device sessions',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.getSessions,
  });

  app.delete('/sessions/:sessionId', {
    preHandler: authenticate,
    schema: {
      tags: ['Auth'],
      summary: 'Revoke a device session',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.revokeSession,
  });
}
