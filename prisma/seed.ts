import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { SYSTEM_ROLES } from '../src/constants/index.js';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: 'Read Users', slug: 'users:read', module: 'users', action: 'read' },
  { name: 'Create Users', slug: 'users:create', module: 'users', action: 'create' },
  { name: 'Update Users', slug: 'users:update', module: 'users', action: 'update' },
  { name: 'Delete Users', slug: 'users:delete', module: 'users', action: 'delete' },
  { name: 'Read Roles', slug: 'roles:read', module: 'roles', action: 'read' },
  { name: 'Create Roles', slug: 'roles:create', module: 'roles', action: 'create' },
  { name: 'Update Roles', slug: 'roles:update', module: 'roles', action: 'update' },
  { name: 'Delete Roles', slug: 'roles:delete', module: 'roles', action: 'delete' },
  { name: 'Read Permissions', slug: 'permissions:read', module: 'permissions', action: 'read' },
  { name: 'Create Permissions', slug: 'permissions:create', module: 'permissions', action: 'create' },
  { name: 'Update Permissions', slug: 'permissions:update', module: 'permissions', action: 'update' },
  { name: 'Delete Permissions', slug: 'permissions:delete', module: 'permissions', action: 'delete' },
];

const ROLES = [
  {
    name: 'Super Admin',
    slug: SYSTEM_ROLES.SUPER_ADMIN,
    description: 'Full system access',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.slug),
  },
  {
    name: 'Admin',
    slug: SYSTEM_ROLES.ADMIN,
    description: 'Administrative access',
    isSystem: true,
    permissions: [
      'users:read',
      'users:update',
      'roles:read',
      'permissions:read',
    ],
  },
  {
    name: 'User',
    slug: SYSTEM_ROLES.USER,
    description: 'Standard user access',
    isSystem: true,
    permissions: [],
  },
];

async function main(): Promise<void> {
  console.log('Seeding database...');

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      create: perm,
      update: { name: perm.name, module: perm.module, action: perm.action },
    });
  }

  console.log(`Seeded ${PERMISSIONS.length} permissions`);

  for (const roleData of ROLES) {
    const { permissions: permSlugs, ...role } = roleData;

    const createdRole = await prisma.role.upsert({
      where: { slug: role.slug },
      create: role,
      update: { name: role.name, description: role.description },
    });

    for (const slug of permSlugs) {
      const permission = await prisma.permission.findUnique({ where: { slug } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: createdRole.id,
              permissionId: permission.id,
            },
          },
          create: {
            roleId: createdRole.id,
            permissionId: permission.id,
          },
          update: {},
        });
      }
    }
  }

  console.log(`Seeded ${ROLES.length} roles`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123456';

  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
    update: {
      passwordHash,
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
    },
  });

  const superAdminRole = await prisma.role.findUnique({
    where: { slug: SYSTEM_ROLES.SUPER_ADMIN },
  });

  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: superAdminRole.id,
        },
      },
      create: {
        userId: adminUser.id,
        roleId: superAdminRole.id,
      },
      update: {},
    });
  }

  console.log(`Seeded admin user: ${adminEmail}`);
  console.log('Database seeding completed');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
