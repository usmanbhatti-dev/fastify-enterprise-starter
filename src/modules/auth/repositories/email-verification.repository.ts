import type { EmailVerification } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export class EmailVerificationRepository {
  async findByTokenHash(hash: string): Promise<EmailVerification | null> {
    return prisma.emailVerification.findFirst({
      where: {
        tokenHash: hash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<EmailVerification> {
    await prisma.emailVerification.updateMany({
      where: { userId: data.userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    return prisma.emailVerification.create({ data });
  }

  async markAsUsed(id: string): Promise<void> {
    await prisma.emailVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }
}
