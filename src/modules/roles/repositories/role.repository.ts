import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

export class RoleRepository {
  async findById(id: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Role | null> {
    return prisma.role.findUnique({ where: { slug } });
  }

  async findByIdWithPermissions(id: string): Promise<RoleWithPermissions | null> {
    return prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async findMany(params: {
    skip: number;
    take: number;
    where?: Prisma.RoleWhereInput;
    orderBy?: Prisma.RoleOrderByWithRelationInput;
  }): Promise<Role[]> {
    return prisma.role.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.RoleWhereInput): Promise<number> {
    return prisma.role.count({ where });
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
    isSystem?: boolean;
  }): Promise<Role> {
    return prisma.role.create({ data });
  }

  async update(id: string, data: Prisma.RoleUpdateInput): Promise<Role> {
    return prisma.role.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.role.delete({ where: { id } });
  }

  async assignPermission(roleId: string, permissionId: string): Promise<void> {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });
  }

  async removePermission(roleId: string, permissionId: string): Promise<void> {
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
    });
  }
}
