import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { RoleController } from '../controllers/role.controller.js';
import { validateRequest } from '../../../validators/index.js';
import {
  createRoleSchema,
  updateRoleSchema,
  assignPermissionsSchema,
  listRolesQuerySchema,
  roleIdParamSchema,
} from '../validators/role.validator.js';

export function roleRoutes(
  app: FastifyInstance,
  controller: RoleController,
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  requirePermission: (
    ...permissions: string[]
  ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.get('/', {
    preHandler: [
      authenticate,
      requirePermission('roles:read'),
      validateRequest(listRolesQuerySchema, 'query'),
    ],
    schema: { tags: ['Roles'], summary: 'List roles', security: [{ bearerAuth: [] }] },
    handler: controller.list,
  });

  app.get('/:id', {
    preHandler: [
      authenticate,
      requirePermission('roles:read'),
      validateRequest(roleIdParamSchema, 'params'),
    ],
    schema: { tags: ['Roles'], summary: 'Get role by ID', security: [{ bearerAuth: [] }] },
    handler: controller.getById,
  });

  app.post('/', {
    preHandler: [
      authenticate,
      requirePermission('roles:create'),
      validateRequest(createRoleSchema, 'body'),
    ],
    schema: { tags: ['Roles'], summary: 'Create role', security: [{ bearerAuth: [] }] },
    handler: controller.create,
  });

  app.patch('/:id', {
    preHandler: [
      authenticate,
      requirePermission('roles:update'),
      validateRequest(roleIdParamSchema, 'params'),
      validateRequest(updateRoleSchema, 'body'),
    ],
    schema: { tags: ['Roles'], summary: 'Update role', security: [{ bearerAuth: [] }] },
    handler: controller.update,
  });

  app.delete('/:id', {
    preHandler: [
      authenticate,
      requirePermission('roles:delete'),
      validateRequest(roleIdParamSchema, 'params'),
    ],
    schema: { tags: ['Roles'], summary: 'Delete role', security: [{ bearerAuth: [] }] },
    handler: controller.delete,
  });

  app.post('/:id/permissions', {
    preHandler: [
      authenticate,
      requirePermission('roles:update'),
      validateRequest(roleIdParamSchema, 'params'),
      validateRequest(assignPermissionsSchema, 'body'),
    ],
    schema: {
      tags: ['Roles'],
      summary: 'Assign permissions to role',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.assignPermissions,
  });

  app.delete('/:id/permissions/:permissionId', {
    preHandler: [authenticate, requirePermission('roles:update')],
    schema: {
      tags: ['Roles'],
      summary: 'Remove permission from role',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.removePermission,
  });
}
