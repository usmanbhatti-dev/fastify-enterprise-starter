import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { PermissionController } from '../controllers/permission.controller.js';
import { validateRequest } from '../../../validators/index.js';
import {
  createPermissionSchema,
  updatePermissionSchema,
  listPermissionsQuerySchema,
  permissionIdParamSchema,
} from '../validators/permission.validator.js';

export function permissionRoutes(
  app: FastifyInstance,
  controller: PermissionController,
  authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
  requirePermission: (
    ...permissions: string[]
  ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>,
): void {
  app.get('/', {
    preHandler: [
      authenticate,
      requirePermission('permissions:read'),
      validateRequest(listPermissionsQuerySchema, 'query'),
    ],
    schema: { tags: ['Permissions'], summary: 'List permissions', security: [{ bearerAuth: [] }] },
    handler: controller.list,
  });

  app.get('/:id', {
    preHandler: [
      authenticate,
      requirePermission('permissions:read'),
      validateRequest(permissionIdParamSchema, 'params'),
    ],
    schema: {
      tags: ['Permissions'],
      summary: 'Get permission by ID',
      security: [{ bearerAuth: [] }],
    },
    handler: controller.getById,
  });

  app.post('/', {
    preHandler: [
      authenticate,
      requirePermission('permissions:create'),
      validateRequest(createPermissionSchema, 'body'),
    ],
    schema: { tags: ['Permissions'], summary: 'Create permission', security: [{ bearerAuth: [] }] },
    handler: controller.create,
  });

  app.patch('/:id', {
    preHandler: [
      authenticate,
      requirePermission('permissions:update'),
      validateRequest(permissionIdParamSchema, 'params'),
      validateRequest(updatePermissionSchema, 'body'),
    ],
    schema: { tags: ['Permissions'], summary: 'Update permission', security: [{ bearerAuth: [] }] },
    handler: controller.update,
  });

  app.delete('/:id', {
    preHandler: [
      authenticate,
      requirePermission('permissions:delete'),
      validateRequest(permissionIdParamSchema, 'params'),
    ],
    schema: { tags: ['Permissions'], summary: 'Delete permission', security: [{ bearerAuth: [] }] },
    handler: controller.delete,
  });
}
