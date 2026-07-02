import { z } from 'zod';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'email', 'firstName', 'lastName', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  filter_status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

export const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required'),
});

export const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
