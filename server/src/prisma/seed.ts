import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      permissions: ['*'], // All permissions
    },
  });

  const hrManagerRole = await prisma.role.upsert({
    where: { name: 'HR Manager' },
    update: {},
    create: {
      name: 'HR Manager',
      permissions: ['hr.view', 'hr.create', 'hr.update', 'hr.delete'],
    },
  });

  const dealerRole = await prisma.role.upsert({
    where: { name: 'Dealer' },
    update: {},
    create: {
      name: 'Dealer',
      permissions: ['crm.view', 'crm.create', 'crm.update', 'properties.view'],
    },
  });

  const tenantRole = await prisma.role.upsert({
    where: { name: 'Tenant' },
    update: {},
    create: {
      name: 'Tenant',
      permissions: ['tenant.view', 'tenant.update'],
    },
  });

  const accountantRole = await prisma.role.upsert({
    where: { name: 'Accountant' },
    update: {},
    create: {
      name: 'Accountant',
      permissions: ['finance.view', 'finance.create', 'finance.update', 'finance.delete'],
    },
  });

  // Create default admin user
  const adminPassword = await hashPassword('admin123');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@realestate.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@realestate.com',
      password: adminPassword,
      roleId: adminRole.id,
      deviceApprovalStatus: 'approved',
    },
  });

  console.log('✅ Seeding completed!');
  console.log('📧 Admin credentials:');
  console.log('   Email: admin@realestate.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

