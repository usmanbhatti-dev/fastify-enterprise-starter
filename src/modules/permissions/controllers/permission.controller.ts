import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PermissionService } from '../services/permission.service.js';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '../../../utils/response.util.js';
import { HTTP_STATUS } from '../../../constants/index.js';
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from '../validators/permission.validator.js';

export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  list = async (
    request: FastifyRequest<{
      Querystring: { page?: number; limit?: number; search?: string; filter_module?: string };
    }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.permissionService.list(request.query);
    void reply.send(paginatedResponse(result.permissions, result.meta));
  };

  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const permission = await this.permissionService.getById(request.params.id);
    void reply.send(successResponse(permission));
  };

  create = async (
    request: FastifyRequest<{ Body: CreatePermissionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const permission = await this.permissionService.create(request.body);
    void reply.status(HTTP_STATUS.CREATED).send(createdResponse(permission));
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdatePermissionInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const permission = await this.permissionService.update(request.params.id, request.body);
    void reply.send(successResponse(permission, 'Permission updated'));
  };

  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.permissionService.delete(request.params.id);
    void reply.send(successResponse(null, 'Permission deleted'));
  };
}
