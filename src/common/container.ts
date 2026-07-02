import { prisma } from '../database/index.js';
import { getRedisClient } from '../cache/index.js';
import { CacheService } from '../cache/cache.service.js';
import { QueueService } from '../queue/queue.service.js';
import { HashService } from '../common/services/hash.service.js';
import { TokenService } from '../common/services/token.service.js';
import { OtpService } from '../common/services/otp.service.js';
import { EmailService } from '../common/services/email.service.js';
import { createStorageProvider } from '../storage/index.js';
import type { AppDependencies } from '../interfaces/index.js';
import type { StorageProvider } from '../storage/storage.interface.js';

import { UserRepository } from '../modules/users/repositories/user.repository.js';
import { RoleRepository } from '../modules/roles/repositories/role.repository.js';
import { PermissionRepository } from '../modules/permissions/repositories/permission.repository.js';
import { SessionRepository } from '../modules/auth/repositories/session.repository.js';
import { PasswordResetRepository } from '../modules/auth/repositories/password-reset.repository.js';
import { EmailVerificationRepository } from '../modules/auth/repositories/email-verification.repository.js';

import { AuthService } from '../modules/auth/services/auth.service.js';
import { UserService } from '../modules/users/services/user.service.js';
import { RoleService } from '../modules/roles/services/role.service.js';
import { PermissionService } from '../modules/permissions/services/permission.service.js';

import { AuthController } from '../modules/auth/controllers/auth.controller.js';
import { UserController } from '../modules/users/controllers/user.controller.js';
import { RoleController } from '../modules/roles/controllers/role.controller.js';
import { PermissionController } from '../modules/permissions/controllers/permission.controller.js';

import { createAuthMiddleware, requirePermissions } from '../middleware/auth.middleware.js';

export interface AppContainer {
  dependencies: AppDependencies;
  storage: StorageProvider;
  emailService: EmailService;
  repositories: {
    user: UserRepository;
    role: RoleRepository;
    permission: PermissionRepository;
    session: SessionRepository;
    passwordReset: PasswordResetRepository;
    emailVerification: EmailVerificationRepository;
  };
  services: {
    auth: AuthService;
    user: UserService;
    role: RoleService;
    permission: PermissionService;
  };
  controllers: {
    auth: AuthController;
    user: UserController;
    role: RoleController;
    permission: PermissionController;
  };
  middleware: {
    authenticate: ReturnType<typeof createAuthMiddleware>;
    requirePermission: typeof requirePermissions;
  };
  queueService: QueueService;
}

export function createContainer(): AppContainer {
  const redis = getRedisClient();
  const cache = new CacheService(redis);
  const hashService = new HashService();
  const tokenService = new TokenService();
  const otpService = new OtpService(redis);
  const queueService = new QueueService(redis);
  const emailService = new EmailService();
  const storage = createStorageProvider();

  const dependencies: AppDependencies = {
    prisma,
    redis,
    cache,
    queue: queueService,
    hashService,
    tokenService,
    otpService,
    storage,
    emailService,
  };

  const userRepository = new UserRepository();
  const roleRepository = new RoleRepository();
  const permissionRepository = new PermissionRepository();
  const sessionRepository = new SessionRepository();
  const passwordResetRepository = new PasswordResetRepository();
  const emailVerificationRepository = new EmailVerificationRepository();

  const authService = new AuthService(
    userRepository,
    roleRepository,
    sessionRepository,
    passwordResetRepository,
    emailVerificationRepository,
    hashService,
    tokenService,
    queueService,
  );

  const userService = new UserService(userRepository, roleRepository, storage, queueService);
  const roleService = new RoleService(roleRepository, permissionRepository);
  const permissionService = new PermissionService(permissionRepository);

  const authController = new AuthController(authService);
  const userController = new UserController(userService);
  const roleController = new RoleController(roleService);
  const permissionController = new PermissionController(permissionService);

  const authenticate = createAuthMiddleware(tokenService, userRepository, sessionRepository);

  return {
    dependencies,
    storage,
    emailService,
    repositories: {
      user: userRepository,
      role: roleRepository,
      permission: permissionRepository,
      session: sessionRepository,
      passwordReset: passwordResetRepository,
      emailVerification: emailVerificationRepository,
    },
    services: {
      auth: authService,
      user: userService,
      role: roleService,
      permission: permissionService,
    },
    controllers: {
      auth: authController,
      user: userController,
      role: roleController,
      permission: permissionController,
    },
    middleware: {
      authenticate,
      requirePermission: requirePermissions,
    },
    queueService,
  };
}
