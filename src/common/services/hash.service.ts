import * as argon2 from 'argon2';
import { securityConfig } from '../../config/index.js';
import type { IHashService } from '../../interfaces/index.js';
import { createHash } from 'node:crypto';

export class HashService implements IHashService {
  private readonly options = {
    type: argon2.argon2id,
    memoryCost: securityConfig.argon2.memoryCost,
    timeCost: securityConfig.argon2.timeCost,
    parallelism: securityConfig.argon2.parallelism,
  };

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  async hashToken(token: string): Promise<string> {
    return createHash('sha256').update(token).digest('hex');
  }
}

export const hashService = new HashService();
