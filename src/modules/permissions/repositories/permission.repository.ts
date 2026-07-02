import type { Prisma, Permission } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export class PermissionRepository {
  async findById(id: string): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { slug } });
  }

  async findMany(params: {
    skip: number;
    take: number;
    where?: Prisma.PermissionWhereInput;
    orderBy?: Prisma.PermissionOrderByWithRelationInput;
  }): Promise<Permission[]> {
    return prisma.permission.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { module: 'asc' },
    });
  }

  async count(where?: Prisma.PermissionWhereInput): Promise<number> {
    return prisma.permission.count({ where });
  }

  async create(data: {
    name: string;
    slug: string;
    module: string;
    action: string;
    description?: string;
  }): Promise<Permission> {
    return prisma.permission.create({ data });
  }

  async update(id: string, data: Prisma.PermissionUpdateInput): Promise<Permission> {
    return prisma.permission.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await prisma.permission.delete({ where: { id } });
  }
}
