import type { Prisma, User, UserStatus } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    roles: {
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true;
              };
            };
          };
        };
      };
    };
  };
}>;

export type SafeUser = Omit<User, 'passwordHash'>;

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });
  }

  async findMany(params: {
    skip: number;
    take: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<SafeUser[]> {
    const users = await prisma.user.findMany({
      where: { ...params.where, deletedAt: null },
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        status: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });
    return users;
  }

  async count(where?: Prisma.UserWhereInput): Promise<number> {
    return prisma.user.count({
      where: { ...where, deletedAt: null },
    });
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    status?: UserStatus;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        status: data.status ?? 'PENDING_VERIFICATION',
      },
    });
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: { userId, roleId },
      update: {},
    });
  }
}
