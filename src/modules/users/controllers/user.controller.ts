import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserService } from '../services/user.service.js';
import { successResponse, paginatedResponse } from '../../../utils/response.util.js';
import { HTTP_STATUS } from '../../../constants/index.js';
import type {
  ListUsersQuery,
  UpdateUserInput,
  AssignRoleInput,
} from '../validators/user.validator.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  getMe = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = await this.userService.getMe(request.user!.id);
    void reply.send(successResponse(user));
  };

  getById = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.userService.getById(request.params.id);
    void reply.send(successResponse(user));
  };

  list = async (
    request: FastifyRequest<{ Querystring: ListUsersQuery }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.userService.list(request.query);
    void reply.send(paginatedResponse(result.users, result.meta));
  };

  updateMe = async (
    request: FastifyRequest<{ Body: UpdateUserInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.userService.update(request.user!.id, request.body, request.user!.id);
    void reply.send(successResponse(user, 'Profile updated'));
  };

  update = async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.userService.update(request.params.id, request.body, request.user!.id);
    void reply.send(successResponse(user, 'Profile updated'));
  };

  adminUpdate = async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateUserInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.userService.adminUpdate(request.params.id, request.body);
    void reply.send(successResponse(user, 'User updated'));
  };

  assignRole = async (
    request: FastifyRequest<{ Params: { id: string }; Body: AssignRoleInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const user = await this.userService.assignRole(request.params.id, request.body.roleId);
    void reply.send(successResponse(user, 'Role assigned'));
  };

  delete = async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.userService.delete(request.params.id);
    void reply.send(successResponse(null, 'User deleted'));
  };

  uploadAvatar = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const file = await request.file();
    if (!file) {
      void reply.status(HTTP_STATUS.BAD_REQUEST).send({
        success: false,
        message: 'No file uploaded',
        data: null,
      });
      return;
    }

    const user = await this.userService.uploadAvatar(request.user!.id, file);
    void reply.send(successResponse(user, 'Avatar uploaded successfully'));
  };
}
