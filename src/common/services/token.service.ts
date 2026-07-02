import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { jwtConfig } from '../../config/index.js';
import type { ITokenService } from '../../interfaces/index.js';
import type { JwtPayload, RefreshTokenPayload } from '../../types/index.js';
import { UnauthorizedError } from '../../exceptions/index.js';
import { parseDurationToSeconds } from '../../utils/date.util.js';

export class TokenService implements ITokenService {
  private readonly accessSignOptions: SignOptions = {
    expiresIn: jwtConfig.accessExpiresIn as SignOptions['expiresIn'],
  };

  private readonly refreshSignOptions: SignOptions = {
    expiresIn: jwtConfig.refreshExpiresIn as SignOptions['expiresIn'],
  };

  generateAccessToken(payload: Omit<JwtPayload, 'type'>): string {
    return jwt.sign({ ...payload, type: 'access' }, jwtConfig.accessSecret, this.accessSignOptions);
  }

  generateRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      jwtConfig.refreshSecret,
      this.refreshSignOptions,
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, jwtConfig.accessSecret) as JwtPayload;
      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, jwtConfig.refreshSecret) as RefreshTokenPayload;
      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  getAccessTokenExpirySeconds(): number {
    return parseDurationToSeconds(jwtConfig.accessExpiresIn);
  }

  getRefreshTokenExpiryDate(): Date {
    const seconds = parseDurationToSeconds(jwtConfig.refreshExpiresIn);
    return new Date(Date.now() + seconds * 1000);
  }
}

export const tokenService = new TokenService();
