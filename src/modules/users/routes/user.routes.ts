import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { UserController } from '../controllers/user.controller.js';
import { validateRequest } from '../../../validators/index.js';
import {
  listUsersQuerySchema,
  updateUserSchema,
  assignRoleSchema,
  userIdParamSchema,
} from '../validators/user.validator.js';

export function userRoutes(
  app: FastifyInstance,
  controller: UserController,
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  requirePermission: (
    ...permissions: string[]
  ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.post('/me/avatar', {
    preHandler: authenticate,
    schema: {
      tags: ['Users'],
      summary: 'Upload current user avatar',
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
    handler: controller.uploadAvatar,
  });

  app.get('/me', {
    preHandler: authenticate,
    schema: {
      tags: ['Users'],
      summary: 'Get current user profile',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.getMe,
  });

  app.patch('/me', {
    preHandler: [authenticate, validateRequest(updateUserSchema, 'body')],
    schema: {
      tags: ['Users'],
      summary: 'Update current user profile',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.updateMe,
  });

  app.get('/', {
    preHandler: [
      authenticate,
      requirePermission('users:read'),
      validateRequest(listUsersQuerySchema, 'query'),
    ],
    schema: { tags: ['Users'], summary: 'List users', security: [{ bearerAuth: [] }] },
    handler: controller.list,
  });

  app.get('/:id', {
    preHandler: [
      authenticate,
      requirePermission('users:read'),
      validateRequest(userIdParamSchema, 'params'),
    ],
    schema: { tags: ['Users'], summary: 'Get user by ID', security: [{ bearerAuth: [] }] },
    handler: controller.getById,
  });

  app.patch('/:id', {
    preHandler: [
      authenticate,
      requirePermission('users:update'),
      validateRequest(userIdParamSchema, 'params'),
      validateRequest(updateUserSchema, 'body'),
    ],
    schema: { tags: ['Users'], summary: 'Admin update user', security: [{ bearerAuth: [] }] },
    handler: controller.adminUpdate,
  });

  app.post('/:id/roles', {
    preHandler: [
      authenticate,
      requirePermission('users:update'),
      validateRequest(userIdParamSchema, 'params'),
      validateRequest(assignRoleSchema, 'body'),
    ],
    schema: { tags: ['Users'], summary: 'Assign role to user', security: [{ bearerAuth: [] }] },
    handler: controller.assignRole,
  });

  app.delete('/:id', {
    preHandler: [
      authenticate,
      requirePermission('users:delete'),
      validateRequest(userIdParamSchema, 'params'),
    ],
    schema: { tags: ['Users'], summary: 'Delete user', security: [{ bearerAuth: [] }] },
    handler: controller.delete,
  });
}
