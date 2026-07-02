import { z } from 'zod';

export const createPermissionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9:.]+$/, 'Slug must be lowercase alphanumeric with colons or dots'),
  module: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

export const updatePermissionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const listPermissionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  filter_module: z.string().optional(),
});

export const permissionIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
