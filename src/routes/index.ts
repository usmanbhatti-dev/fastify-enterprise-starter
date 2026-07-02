import type { FastifyInstance } from 'fastify';
import type { AppContainer } from '../common/container.js';
import { authRoutes } from '../modules/auth/routes/auth.routes.js';
import { userRoutes } from '../modules/users/routes/user.routes.js';
import { roleRoutes } from '../modules/roles/routes/role.routes.js';
import { permissionRoutes } from '../modules/permissions/routes/permission.routes.js';
import { healthRoutes } from './health.routes.js';
import { appConfig } from '../config/index.js';

export async function registerRoutes(app: FastifyInstance, container: AppContainer): Promise<void> {
  healthRoutes(app);

  const { authenticate, requirePermission } = container.middleware;

  await app.register(
    async (api) => {
      authRoutes(api, container.controllers.auth, authenticate, container.dependencies.redis);
    },
    { prefix: `${appConfig.apiPrefix}/auth` },
  );

  await app.register(
    async (api) => {
      userRoutes(api, container.controllers.user, authenticate, requirePermission);
    },
    { prefix: `${appConfig.apiPrefix}/users` },
  );

  await app.register(
    async (api) => {
      roleRoutes(api, container.controllers.role, authenticate, requirePermission);
    },
    { prefix: `${appConfig.apiPrefix}/roles` },
  );

  await app.register(
    async (api) => {
      permissionRoutes(api, container.controllers.permission, authenticate, requirePermission);
    },
    { prefix: `${appConfig.apiPrefix}/permissions` },
  );
}
