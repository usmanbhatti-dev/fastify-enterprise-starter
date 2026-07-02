import type { MultipartFile } from '@fastify/multipart';
import { URL } from 'node:url';
import { UserRepository } from '../repositories/user.repository.js';
import { RoleRepository } from '../../roles/repositories/role.repository.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../exceptions/index.js';
import type { StorageProvider } from '../../../storage/storage.interface.js';
import type { QueueService } from '../../../queue/queue.service.js';
import {
  parsePagination,
  buildPaginationMeta,
  parseSort,
  buildSearchCondition,
} from '../../../utils/pagination.util.js';
import type { ListUsersQuery, UpdateUserInput } from '../validators/user.validator.js';
import { ALLOWED_UPLOAD_MIME_TYPES } from '../../../storage/storage.interface.js';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly storage: StorageProvider,
    private readonly queueService: QueueService,
  ) {}

  async getById(id: string) {
    const user = await this.userRepository.findByIdWithRoles(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.formatUserResponse(user);
  }

  async getMe(userId: string) {
    return this.getById(userId);
  }

  async list(query: ListUsersQuery) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const { sortBy, sortOrder } = parseSort(query.sortBy, query.sortOrder, [
      'createdAt',
      'email',
      'firstName',
      'lastName',
      'status',
    ]);

    const searchCondition = buildSearchCondition(query.search, ['email', 'firstName', 'lastName']);
    const where = {
      ...searchCondition,
      ...(query.filter_status && { status: query.filter_status }),
    };

    const [users, total] = await Promise.all([
      this.userRepository.findMany({ skip, take: limit, where, orderBy: { [sortBy]: sortOrder } }),
      this.userRepository.count(where),
    ]);

    return {
      users,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async update(id: string, input: UpdateUserInput, requesterId: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (id !== requesterId) {
      throw new ForbiddenError('Cannot update another user profile');
    }

    const updated = await this.userRepository.update(id, input);
    return this.getById(updated.id);
  }

  async adminUpdate(id: string, input: UpdateUserInput) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.update(id, input);
    return this.getById(id);
  }

  async assignRole(userId: string, roleId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    await this.userRepository.assignRole(userId, roleId);
    return this.getById(userId);
  }

  async delete(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.softDelete(id);
  }

  async uploadAvatar(userId: string, file: MultipartFile) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (!file.file) {
      throw new ValidationError('No file provided');
    }

    const mimeType = file.mimetype || 'application/octet-stream';
    if (
      !ALLOWED_UPLOAD_MIME_TYPES.includes(mimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])
    ) {
      throw new ValidationError('Only image files are allowed for avatar upload');
    }

    if (user.avatarUrl) {
      const existingKey = this.extractStorageKey(user.avatarUrl);
      if (existingKey) {
        await this.storage.delete(existingKey);
      }
    }

    const stored = await this.storage.upload({
      stream: file.file,
      originalName: file.filename,
      mimeType,
      folder: 'avatars',
    });

    await this.userRepository.update(userId, { avatarUrl: stored.url });

    await this.queueService.addImageProcessingJob({
      filePath: stored.key,
      operations: [{ type: 'resize', options: { width: 256, height: 256 } }],
      outputPath: stored.key,
    });

    return this.getById(userId);
  }

  private extractStorageKey(avatarUrl: string): string | null {
    if (avatarUrl.startsWith('/uploads/')) {
      return avatarUrl.replace('/uploads/', '');
    }

    try {
      const url = new URL(avatarUrl);
      return url.pathname.replace(/^\//, '');
    } catch {
      return null;
    }
  }

  private formatUserResponse(
    user: NonNullable<Awaited<ReturnType<UserRepository['findByIdWithRoles']>>>,
  ) {
    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        slug: ur.role.slug,
        permissions: ur.role.permissions.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          slug: rp.permission.slug,
        })),
      })),
    };
  }
}
