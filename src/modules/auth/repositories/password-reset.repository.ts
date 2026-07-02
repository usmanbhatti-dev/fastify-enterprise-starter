import type { PasswordReset } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export class PasswordResetRepository {
  async findByTokenHash(hash: string): Promise<PasswordReset | null> {
    return prisma.passwordReset.findFirst({
      where: {
        tokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordReset> {
    await prisma.passwordReset.updateMany({
      where: { userId: data.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return prisma.passwordReset.create({ data });
  }

  async markAsUsed(id: string): Promise<void> {
    await prisma.passwordReset.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
