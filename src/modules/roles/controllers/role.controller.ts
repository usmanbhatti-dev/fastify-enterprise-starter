import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RoleService } from '../services/role.service.js';
import {
  successResponse,
  createdResponse,
  paginatedResponse,
} from '../../../utils/response.util.js';
import { HTTP_STATUS } from '../../../constants/index.js';
import type {
  CreateRoleInput,
  UpdateRoleInput,
  AssignPermissionsInput,
} from '../validators/role.validator.js';

export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  list = async (
    request: FastifyRequest<{ Querystring: { page?: number; limit?: number; search?: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.roleService.list(request.query);
    void reply.send(paginatedResponse(result.roles, result.meta));
  };

  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const role = await this.roleService.getById(request.params.id);
    void reply.send(successResponse(role));
  };

  create = async (
    request: FastifyRequest<{ Body: CreateRoleInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const role = await this.roleService.create(request.body);
    void reply.status(HTTP_STATUS.CREATED).send(createdResponse(role));
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateRoleInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const role = await this.roleService.update(request.params.id, request.body);
    void reply.send(successResponse(role, 'Role updated'));
  };

  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.roleService.delete(request.params.id);
    void reply.send(successResponse(null, 'Role deleted'));
  };

  assignPermissions = async (
    request: FastifyRequest<{ Params: { id: string }; Body: AssignPermissionsInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const role = await this.roleService.assignPermissions(
      request.params.id,
      request.body.permissionIds,
    );
    void reply.send(successResponse(role, 'Permissions assigned'));
  };

  removePermission = async (
    request: FastifyRequest<{ Params: { id: string; permissionId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const role = await this.roleService.removePermission(
      request.params.id,
      request.params.permissionId,
    );
    void reply.send(successResponse(role, 'Permission removed'));
  };
}
