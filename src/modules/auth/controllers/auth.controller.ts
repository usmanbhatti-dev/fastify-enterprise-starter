import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthService } from '../services/auth.service.js';
import { successResponse, createdResponse } from '../../../utils/response.util.js';
import { HTTP_STATUS } from '../../../constants/index.js';
import type {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  VerifyEmailInput,
  ResendVerificationInput,
  LogoutInput,
} from '../validators/auth.validator.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (
    request: FastifyRequest<{ Body: RegisterInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const result = await this.authService.register(request.body);
    void reply
      .status(HTTP_STATUS.CREATED)
      .send(createdResponse(result, 'Registration successful. Please verify your email.'));
  };

  login = async (
    request: FastifyRequest<{ Body: LoginInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const deviceInfo = {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      deviceName: request.headers['x-device-name'] as string | undefined,
      deviceType: request.headers['x-device-type'] as string | undefined,
    };

    const result = await this.authService.login(request.body, deviceInfo);
    void reply.send(successResponse(result, 'Login successful'));
  };

  refreshToken = async (
    request: FastifyRequest<{ Body: RefreshTokenInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    const tokens = await this.authService.refreshToken(request.body.refreshToken);
    void reply.send(successResponse(tokens, 'Token refreshed successfully'));
  };

  logout = async (
    request: FastifyRequest<{ Body: LogoutInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.logout(
      request.user!.id,
      request.user!.sessionId,
      request.body.refreshToken,
      request.body.allDevices,
    );
    void reply.send(successResponse(null, 'Logged out successfully'));
  };

  forgotPassword = async (
    request: FastifyRequest<{ Body: ForgotPasswordInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.forgotPassword(request.body.email);
    void reply.send(
      successResponse(null, 'If the email exists, a password reset link has been sent'),
    );
  };

  resetPassword = async (
    request: FastifyRequest<{ Body: ResetPasswordInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.resetPassword(request.body);
    void reply.send(successResponse(null, 'Password reset successful'));
  };

  changePassword = async (
    request: FastifyRequest<{ Body: ChangePasswordInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.changePassword(request.user!.id, request.body);
    void reply.send(successResponse(null, 'Password changed successfully'));
  };

  verifyEmail = async (
    request: FastifyRequest<{ Body: VerifyEmailInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.verifyEmail(request.body.token);
    void reply.send(successResponse(null, 'Email verified successfully'));
  };

  resendVerification = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await this.authService.resendVerification(request.user!.id);
    void reply.send(successResponse(null, 'Verification email sent'));
  };

  resendVerificationByEmail = async (
    request: FastifyRequest<{ Body: ResendVerificationInput }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.resendVerificationByEmail(request.body.email);
    void reply.send(
      successResponse(
        null,
        'If the email exists and is unverified, a verification email has been sent',
      ),
    );
  };

  getSessions = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const sessions = await this.authService.getSessions(request.user!.id);
    void reply.send(successResponse(sessions));
  };

  revokeSession = async (
    request: FastifyRequest<{ Params: { sessionId: string } }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.authService.revokeSession(request.user!.id, request.params.sessionId);
    void reply.send(successResponse(null, 'Session revoked'));
  };
}
