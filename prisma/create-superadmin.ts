const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { hash } = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function createSuperAdmin() {
  const email = process.env.INITIAL_SUPERADMIN_EMAIL;
  const password = process.env.INITIAL_SUPERADMIN_PASSWORD;
  const name = process.env.INITIAL_SUPERADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error(
      'INITIAL_SUPERADMIN_EMAIL and INITIAL_SUPERADMIN_PASSWORD must be set before seeding a super admin.'
    );
    process.exit(1);
  }

  try {
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.log('No tenant found. Creating a default tenant...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'SLICT',
          subdomain: 'slict',
          companyName: 'SLICT',
          status: 'ACTIVE',
          plan: 'enterprise',
          primaryColor: '#3b82f6',
        },
      });
      console.log('Created default tenant:', tenant);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await hash(password, 10);

    if (existingUser) {
      console.log(`User with email ${email} already exists. Updating to SuperAdmin...`);
      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          isSuperAdmin: true,
          role: 'ADMIN',
          isActive: true,
          name,
        },
      });
      console.log('Updated existing user to SuperAdmin:', updatedUser);
    } else {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          isSuperAdmin: true,
          role: 'ADMIN',
          isActive: true,
          tenantId: tenant.id,
        },
      });
      console.log('Created new SuperAdmin user:', user);
    }

    console.log('SuperAdmin setup completed successfully!');
  } catch (error) {
    console.error('Error creating SuperAdmin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
