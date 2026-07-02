import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import { appConfig } from '../config/index.js';

async function swaggerPlugin(fastify: FastifyInstance): Promise<void> {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: appConfig.name,
        description: 'Enterprise Fastify Backend API',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${appConfig.port}${appConfig.apiPrefix}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User management' },
        { name: 'Roles', description: 'Role management' },
        { name: 'Permissions', description: 'Permission management' },
        { name: 'Health', description: 'Health check endpoints' },
      ],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });
}

export default fp(swaggerPlugin, {
  name: 'swagger-plugin',
});
