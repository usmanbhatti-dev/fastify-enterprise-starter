export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  cursor?: string | null;
  nextCursor?: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
}

export interface DeviceInfo {
  deviceName?: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JobPayload {
  [key: string]: unknown;
}

export interface EmailJobData extends JobPayload {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  priority?: 'high' | 'normal';
}

export interface NotificationJobData extends JobPayload {
  userId: string;
  title: string;
  body: string;
  channel: 'push' | 'sms' | 'in-app';
  metadata?: Record<string, unknown>;
}

export interface ImageProcessingJobData extends JobPayload {
  filePath: string;
  operations: Array<{
    type: 'resize' | 'crop' | 'compress' | 'format';
    options: Record<string, unknown>;
  }>;
  outputPath: string;
}
