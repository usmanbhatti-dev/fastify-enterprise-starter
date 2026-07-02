import type { PrismaClient } from '@prisma/client';
import type { Redis } from 'ioredis';
import type { StorageProvider } from '../storage/storage.interface.js';
import type { EmailService } from '../common/services/email.service.js';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../types/index.js';

export interface IRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>;
  findMany(params?: Record<string, unknown>): Promise<T[]>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delPattern(pattern: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  increment(key: string, ttlSeconds?: number): Promise<number>;
}

export interface IQueueService {
  addEmailJob(data: import('../types/index.js').EmailJobData): Promise<string>;
  addNotificationJob(data: import('../types/index.js').NotificationJobData): Promise<string>;
  addImageProcessingJob(data: import('../types/index.js').ImageProcessingJobData): Promise<string>;
  close(): Promise<void>;
}

export interface IHashService {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
  hashToken(token: string): Promise<string>;
}

export interface ITokenService {
  generateAccessToken(payload: Omit<import('../types/index.js').JwtPayload, 'type'>): string;
  generateRefreshToken(
    payload: Omit<import('../types/index.js').RefreshTokenPayload, 'type'>,
  ): string;
  verifyAccessToken(token: string): import('../types/index.js').JwtPayload;
  verifyRefreshToken(token: string): import('../types/index.js').RefreshTokenPayload;
  getAccessTokenExpirySeconds(): number;
  getRefreshTokenExpiryDate(): Date;
}

export interface IOtpService {
  generate(purpose: string, identifier: string, length?: number): Promise<string>;
  verify(purpose: string, identifier: string, code: string): Promise<boolean>;
  delete(purpose: string, identifier: string): Promise<void>;
}

export interface AppDependencies {
  prisma: PrismaClient;
  redis: Redis;
  cache: ICacheService;
  queue: IQueueService;
  hashService: IHashService;
  tokenService: ITokenService;
  otpService: IOtpService;
  storage: StorageProvider;
  emailService: EmailService;
}

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    redis: Redis;
    dependencies: AppDependencies;
  }

  interface FastifyRequest {
    user?: AuthenticatedUser;
    requestId: string;
    correlationId: string;
  }
}

export type FastifyApp = FastifyInstance;
export type AppRequest = FastifyRequest;
