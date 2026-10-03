import prisma from './prisma';
import { hash } from 'bcryptjs';
import type { User, Tenant } from '@prisma/client';

type UserWithTenant = User & { tenant: Tenant | null };

/**
 * Get or create a default tenant for development
 * This is useful when running the app without proper authentication setup
 */
export async function getOrCreateDefaultTenant() {
  try {
    // Try to find an existing tenant (prioritize demo)
    let tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { subdomain: 'demo' },
          { subdomain: 'default' },
          { companyName: { contains: 'Default' } }
        ]
      },
      orderBy: {
        subdomain: 'asc' // 'demo' comes before 'default' alphabetically, but let's rely on the OR order or just explicit check
      }
    });

    // Explicitly check for demo first if multiple returned (though findFirst returns one)
    // If we want to be sure we get 'demo' if it exists:
    // Explicitly check for slict first (Project requirement)
    const slictTenant = await prisma.tenant.findUnique({ where: { subdomain: 'slict' } });
    if (slictTenant) {
      tenant = slictTenant;
    } else {
      const demoTenant = await prisma.tenant.findUnique({ where: { subdomain: 'demo' } });
      if (demoTenant) {
        tenant = demoTenant;
      }
    }

    // If no tenant exists, create one
    if (!tenant) {
      console.log('📦 Creating default tenant for development...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Default Company',
          companyName: 'Default Company',
          subdomain: 'default',
          domain: 'localhost',
          status: 'ACTIVE',
          settings: {
            industry: 'Technology',
            country: 'US',
            currency: 'USD',
          },
        },
      });
      console.log('✅ Default tenant created:', tenant.id);
    }

    return tenant;
  } catch (error) {
    console.error('❌ Error getting/creating default tenant:', error);
    throw error;
  }
}

/**
 * Get or create a default admin user for development
 */
export async function getOrCreateDefaultUser() {
  try {
    const tenant = await getOrCreateDefaultTenant();

    // Try to find existing admin user
    let user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        OR: [
          { isSuperAdmin: true },
          { email: { contains: 'admin' } },
          { email: { contains: 'demo' } }
        ]
      },
      include: {
        tenant: true,
      },
    });

    // If no admin user exists, create one
    if (!user) {
      console.log('👤 Creating default admin user for development...');
      const hashedPassword = await hash('admin123', 10);

      user = await prisma.user.create({
        data: {
          email: 'admin@default.com',
          name: 'Admin User',
          password: hashedPassword,
          tenantId: tenant.id,
          isSuperAdmin: true,
          role: 'ADMIN',
          isActive: true,
        },
        include: {
          tenant: true,
        },
      });

      console.log('✅ Default admin user created:');
      console.log('   Email: admin@default.com');
      console.log('   Password: admin123');
      console.log('   🔐 Please change this password in production!');
    }

    return user;
  } catch (error) {
    console.error('❌ Error getting/creating default user:', error);
    throw error;
  }
}

/**
 * Format user for session
 */
export function formatUserForSession(user: UserWithTenant) {
  // Determine user role: prioritize isSuperAdmin, then use database role field, default to USER
  const userRole = user.isSuperAdmin ? 'ADMIN' : (user.role || 'USER');

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: userRole,
    isSuperAdmin: user.isSuperAdmin,
    tenantId: user.tenantId,
    tenant: user.tenant?.name ?? user.tenant?.companyName ?? 'Default',
    modulePermissions: (user.modulePermissions as Record<string, any>) || {},
    enabledModuleIds: Object.keys((user.modulePermissions as Record<string, any>) || {}).filter(key => (user.modulePermissions as any)?.[key]?.enabled),
  };
}

