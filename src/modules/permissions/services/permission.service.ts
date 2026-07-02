import { PermissionRepository } from '../repositories/permission.repository.js';
import { ConflictError, NotFoundError } from '../../../exceptions/index.js';
import {
  parsePagination,
  buildPaginationMeta,
  buildSearchCondition,
} from '../../../utils/pagination.util.js';
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from '../validators/permission.validator.js';

export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async getById(id: string) {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new NotFoundError('Permission not found');
    }
    return permission;
  }

  async list(query: { page?: number; limit?: number; search?: string; filter_module?: string }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const searchCondition = buildSearchCondition(query.search, [
      'name',
      'slug',
      'module',
      'action',
    ]);
    const where = {
      ...searchCondition,
      ...(query.filter_module && { module: query.filter_module }),
    };

    const [permissions, total] = await Promise.all([
      this.permissionRepository.findMany({ skip, take: limit, where }),
      this.permissionRepository.count(where),
    ]);

    return {
      permissions,
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async create(input: CreatePermissionInput) {
    const existing = await this.permissionRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError('Permission with this slug already exists');
    }

    return this.permissionRepository.create(input);
  }

  async update(id: string, input: UpdatePermissionInput) {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    return this.permissionRepository.update(id, input);
  }

  async delete(id: string) {
    const permission = await this.permissionRepository.findById(id);
    if (!permission) {
      throw new NotFoundError('Permission not found');
    }

    await this.permissionRepository.delete(id);
  }
}
