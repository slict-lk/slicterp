const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUser() {
  const email = 'demo@slict.lk';
  const password = 'demo@slict';
  const name = 'Demo User';

  try {
    // Ensure a tenant exists (reuse same logic as superadmin script)
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
      console.log('Created default tenant:', tenant.id);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await hash(password, 10);

    if (existingUser) {
      console.log(`User with email ${email} already exists. Updating demo user...`);

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          password: hashedPassword,
          isSuperAdmin: false,
          role: 'USER',
          isActive: true,
          name,
          tenantId: tenant.id,
        },
      });

      console.log('Updated existing demo user:', { id: updatedUser.id, email: updatedUser.email });
    } else {
      // Create new demo user
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          isSuperAdmin: false,
          role: 'USER',
          isActive: true,
          tenantId: tenant.id,
        },
      });

      console.log('Created new demo user:', { id: user.id, email: user.email });
    }

    console.log('Demo user setup completed successfully!');
  } catch (error) {
    console.error('Error creating demo user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUser();

//npx ts-node prisma/create-demo_user.ts