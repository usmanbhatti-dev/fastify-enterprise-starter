import type { Session } from '@prisma/client';
import { prisma } from '../../../database/index.js';

export class SessionRepository {
  async findById(id: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { id } });
  }

  async findActiveById(id: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByRefreshTokenHash(hash: string): Promise<Session | null> {
    return prisma.session.findFirst({
      where: {
        refreshTokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    userId: string;
    refreshTokenHash: string;
    deviceName?: string;
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<Session> {
    return prisma.session.create({ data });
  }

  async updateRefreshToken(
    id: string,
    refreshTokenHash: string,
    expiresAt: Date,
  ): Promise<Session> {
    return prisma.session.update({
      where: { id },
      data: { refreshTokenHash, expiresAt },
    });
  }

  async rotateRefreshToken(
    sessionId: string,
    currentHash: string,
    newHash: string,
    expiresAt: Date,
  ): Promise<{ rotated: boolean; reuseDetected: boolean }> {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      return { rotated: false, reuseDetected: false };
    }

    if (session.refreshTokenHash !== currentHash) {
      return { rotated: false, reuseDetected: true };
    }

    const result = await prisma.session.updateMany({
      where: {
        id: sessionId,
        refreshTokenHash: currentHash,
        revokedAt: null,
      },
      data: {
        refreshTokenHash: newHash,
        expiresAt,
      },
    });

    return { rotated: result.count > 0, reuseDetected: false };
  }

  async revoke(id: string): Promise<void> {
    await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<void> {
    await prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId && { id: { not: exceptSessionId } }),
      },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }],
      },
    });
    return result.count;
  }
}
