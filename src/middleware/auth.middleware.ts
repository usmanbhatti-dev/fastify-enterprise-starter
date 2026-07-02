import type { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../exceptions/index.js';
import type { TokenService } from '../common/services/token.service.js';
import type { UserRepository } from '../modules/users/repositories/user.repository.js';
import type { SessionRepository } from '../modules/auth/repositories/session.repository.js';
import type { UserStatus } from '@prisma/client';

const DEFAULT_ALLOWED_STATUSES: UserStatus[] = ['ACTIVE'];

export function createAuthMiddleware(
  tokenService: TokenService,
  userRepository: UserRepository,
  sessionRepository: SessionRepository,
  allowedStatuses: UserStatus[] = DEFAULT_ALLOWED_STATUSES,
) {
  return async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = tokenService.verifyAccessToken(token);

    const session = await sessionRepository.findActiveById(payload.sessionId);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedError('Session is invalid or has been revoked');
    }

    const user = await userRepository.findByIdWithRoles(payload.sub);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!allowedStatuses.includes(user.status)) {
      throw new UnauthorizedError('Account is not active');
    }

    const roles = user.roles.map((ur) => ur.role.slug);
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map((rp) => rp.permission.slug),
    );

    request.user = {
      id: user.id,
      email: user.email,
      sessionId: payload.sessionId,
      roles,
      permissions: [...new Set(permissions)],
    };
  };
}

export function requireRoles(...roles: string[]) {
  return async function checkRoles(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    const hasRole = roles.some((role) => request.user!.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenError('Insufficient role permissions');
    }
  };
}

export function requirePermissions(...permissions: string[]) {
  return async function checkPermissions(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    const hasPermission = permissions.every((perm) => request.user!.permissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return async function checkAnyPermission(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    const hasPermission = permissions.some((perm) => request.user!.permissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}
