import type { HashService } from '../../../common/services/hash.service.js';
import type { TokenService } from '../../../common/services/token.service.js';
import type { QueueService } from '../../../queue/queue.service.js';
import { UserRepository } from '../../users/repositories/user.repository.js';
import { RoleRepository } from '../../roles/repositories/role.repository.js';
import { SessionRepository } from '../repositories/session.repository.js';
import { PasswordResetRepository } from '../repositories/password-reset.repository.js';
import { EmailVerificationRepository } from '../repositories/email-verification.repository.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '../../../exceptions/index.js';
import type { DeviceInfo, TokenPair } from '../../../types/index.js';
import { generateSecureToken } from '../../../utils/async.util.js';
import { addHours } from '../../../utils/date.util.js';
import {
  PASSWORD_RESET_EXPIRY_HOURS,
  EMAIL_VERIFICATION_EXPIRY_HOURS,
  SYSTEM_ROLES,
} from '../../../constants/index.js';
import {
  enqueuePasswordResetEmail,
  enqueueEmailVerification,
  enqueueWelcomeEmail,
} from '../../../jobs/email.jobs.js';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  ResetPasswordInput,
} from '../validators/auth.validator.js';
import { omit } from '../../../utils/async.util.js';

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly passwordResetRepository: PasswordResetRepository,
    private readonly emailVerificationRepository: EmailVerificationRepository,
    private readonly hashService: HashService,
    private readonly tokenService: TokenService,
    private readonly queueService: QueueService,
  ) {}

  async register(input: RegisterInput): Promise<{ user: Record<string, unknown> }> {
    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await this.hashService.hash(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const defaultRole = await this.roleRepository.findBySlug(SYSTEM_ROLES.USER);
    if (defaultRole) {
      await this.userRepository.assignRole(user.id, defaultRole.id);
    }

    await this.sendVerificationEmail(user.id, user.email);

    return {
      user: omit(user, ['passwordHash']),
    };
  }

  async login(
    input: LoginInput,
    deviceInfo: DeviceInfo,
  ): Promise<{ user: Record<string, unknown>; tokens: TokenPair }> {
    const user = await this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await this.hashService.verify(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'PENDING_VERIFICATION') {
      throw new UnauthorizedError('Please verify your email before logging in');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedError('Account has been suspended');
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedError('Account is inactive');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.createSession(user.id, user.email, deviceInfo);

    return {
      user: omit(user, ['passwordHash']),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const tokenHash = await this.hashService.hashToken(refreshToken);

    const session = await this.sessionRepository.findByRefreshTokenHash(tokenHash);
    if (!session || session.id !== payload.sessionId) {
      const existingSession = await this.sessionRepository.findById(payload.sessionId);
      if (existingSession && existingSession.refreshTokenHash !== tokenHash) {
        await this.sessionRepository.revokeAllForUser(existingSession.userId);
        throw new UnauthorizedError(
          'Refresh token reuse detected. All sessions have been revoked.',
        );
      }
      throw new UnauthorizedError('Invalid refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      await this.sessionRepository.revoke(session.id);
      throw new UnauthorizedError('User account is not active');
    }

    const newRefreshToken = this.tokenService.generateRefreshToken({
      sub: user.id,
      sessionId: session.id,
    });
    const newRefreshTokenHash = await this.hashService.hashToken(newRefreshToken);
    const expiresAt = this.tokenService.getRefreshTokenExpiryDate();

    const rotation = await this.sessionRepository.rotateRefreshToken(
      session.id,
      tokenHash,
      newRefreshTokenHash,
      expiresAt,
    );

    if (rotation.reuseDetected) {
      await this.sessionRepository.revokeAllForUser(user.id);
      throw new UnauthorizedError('Refresh token reuse detected. All sessions have been revoked.');
    }

    if (!rotation.rotated) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.tokenService.getAccessTokenExpirySeconds(),
    };
  }

  async logout(
    userId: string,
    sessionId: string,
    refreshToken?: string,
    allDevices = false,
  ): Promise<void> {
    if (allDevices) {
      await this.sessionRepository.revokeAllForUser(userId);
      return;
    }

    if (refreshToken) {
      const tokenHash = await this.hashService.hashToken(refreshToken);
      const session = await this.sessionRepository.findByRefreshTokenHash(tokenHash);
      if (session) {
        if (session.userId !== userId) {
          throw new UnauthorizedError('Invalid session');
        }
        await this.sessionRepository.revoke(session.id);
        return;
      }
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedError('Invalid session');
    }

    await this.sessionRepository.revoke(sessionId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return;
    }

    const resetToken = generateSecureToken(48);
    const tokenHash = await this.hashService.hashToken(resetToken);

    await this.passwordResetRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt: addHours(new Date(), PASSWORD_RESET_EXPIRY_HOURS),
    });

    await enqueuePasswordResetEmail(this.queueService, user.email, resetToken);
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = await this.hashService.hashToken(input.token);
    const resetRecord = await this.passwordResetRepository.findByTokenHash(tokenHash);

    if (!resetRecord) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const passwordHash = await this.hashService.hash(input.password);
    await this.userRepository.update(resetRecord.userId, { passwordHash });
    await this.passwordResetRepository.markAsUsed(resetRecord.id);
    await this.sessionRepository.revokeAllForUser(resetRecord.userId);
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await this.hashService.verify(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const passwordHash = await this.hashService.hash(input.newPassword);
    await this.userRepository.update(userId, { passwordHash });
    await this.sessionRepository.revokeAllForUser(userId);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = await this.hashService.hashToken(token);
    const verification = await this.emailVerificationRepository.findByTokenHash(tokenHash);

    if (!verification) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await this.userRepository.update(verification.userId, {
      emailVerifiedAt: new Date(),
      status: 'ACTIVE',
    });
    await this.emailVerificationRepository.markAsUsed(verification.id);

    const user = await this.userRepository.findById(verification.userId);
    if (user) {
      await enqueueWelcomeEmail(this.queueService, user.email, user.firstName ?? 'User');
    }
  }

  async resendVerificationByEmail(email: string): Promise<void> {
    const user = await this.userRepository.findByEmail(email);
    if (!user || user.emailVerifiedAt) {
      return;
    }

    await this.sendVerificationEmail(user.id, user.email);
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.emailVerifiedAt) {
      throw new ValidationError('Email is already verified');
    }

    await this.sendVerificationEmail(user.id, user.email);
  }

  async getSessions(userId: string): Promise<Array<Record<string, unknown>>> {
    const sessions = await this.sessionRepository.findByUserId(userId);
    return sessions.map((s) => ({
      id: s.id,
      deviceName: s.deviceName,
      deviceType: s.deviceType,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundError('Session not found');
    }
    await this.sessionRepository.revoke(sessionId);
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const verificationToken = generateSecureToken(48);
    const tokenHash = await this.hashService.hashToken(verificationToken);

    await this.emailVerificationRepository.create({
      userId,
      tokenHash,
      expiresAt: addHours(new Date(), EMAIL_VERIFICATION_EXPIRY_HOURS),
    });

    await enqueueEmailVerification(this.queueService, email, verificationToken);
  }

  private async createSession(
    userId: string,
    email: string,
    deviceInfo: DeviceInfo,
  ): Promise<TokenPair> {
    const refreshToken = this.tokenService.generateRefreshToken({
      sub: userId,
      sessionId: 'pending',
    });

    const refreshTokenHash = await this.hashService.hashToken(refreshToken);
    const expiresAt = this.tokenService.getRefreshTokenExpiryDate();

    const session = await this.sessionRepository.create({
      userId,
      refreshTokenHash,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent,
      expiresAt,
    });

    const finalRefreshToken = this.tokenService.generateRefreshToken({
      sub: userId,
      sessionId: session.id,
    });
    const finalHash = await this.hashService.hashToken(finalRefreshToken);
    await this.sessionRepository.updateRefreshToken(session.id, finalHash, expiresAt);

    const accessToken = this.tokenService.generateAccessToken({
      sub: userId,
      email,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: finalRefreshToken,
      expiresIn: this.tokenService.getAccessTokenExpirySeconds(),
    };
  }
}
