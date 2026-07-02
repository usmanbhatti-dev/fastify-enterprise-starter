import { RoleRepository } from '../repositories/role.repository.js';
import { PermissionRepository } from '../../permissions/repositories/permission.repository.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../../exceptions/index.js';
import {
  parsePagination,
  buildPaginationMeta,
  buildSearchCondition,
} from '../../../utils/pagination.util.js';
import type { CreateRoleInput, UpdateRoleInput } from '../validators/role.validator.js';

export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async getById(id: string) {
    const role = await this.roleRepository.findByIdWithPermissions(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    return this.formatRole(role);
  }

  async list(query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = parsePagination(query.page, query.limit);
    const searchCondition = buildSearchCondition(query.search, ['name', 'slug', 'description']);
    const where = searchCondition ?? {};

    const [roles, total] = await Promise.all([
      this.roleRepository.findMany({ skip, take: limit, where }),
      this.roleRepository.count(where),
    ]);

    return {
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        description: r.description,
        isSystem: r.isSystem,
        createdAt: r.createdAt,
      })),
      meta: buildPaginationMeta(page, limit, total),
    };
  }

  async create(input: CreateRoleInput) {
    const existing = await this.roleRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError('Role with this slug already exists');
    }

    const role = await this.roleRepository.create(input);
    return this.getById(role.id);
  }

  async update(id: string, input: UpdateRoleInput) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot modify system roles');
    }

    await this.roleRepository.update(id, input);
    return this.getById(id);
  }

  async delete(id: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    if (role.isSystem) {
      throw new ForbiddenError('Cannot delete system roles');
    }

    await this.roleRepository.delete(id);
  }

  async assignPermissions(roleId: string, permissionIds: string[]) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    for (const permissionId of permissionIds) {
      const permission = await this.permissionRepository.findById(permissionId);
      if (!permission) {
        throw new NotFoundError(`Permission ${permissionId} not found`);
      }
      await this.roleRepository.assignPermission(roleId, permissionId);
    }

    return this.getById(roleId);
  }

  async removePermission(roleId: string, permissionId: string) {
    const role = await this.roleRepository.findById(roleId);
    if (!role) {
      throw new NotFoundError('Role not found');
    }

    await this.roleRepository.removePermission(roleId, permissionId);
    return this.getById(roleId);
  }

  private formatRole(
    role: NonNullable<Awaited<ReturnType<RoleRepository['findByIdWithPermissions']>>>,
  ) {
    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isSystem: role.isSystem,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.permissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        slug: rp.permission.slug,
        module: rp.permission.module,
        action: rp.permission.action,
      })),
    };
  }
}
