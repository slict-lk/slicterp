import { headers } from 'next/headers';
import prisma from './prisma';

/**
 * Multi-Tenant Resolver
 * Extracts tenant from subdomain or domain
 */
export async function getCurrentTenant() {
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const rootAppHosts = ['apps.slict.lk', 'www.apps.slict.lk'];

  // Extract subdomain
  const hostParts = host.split('.');

  // Local development: localhost:3000 or specific subdomain.localhost
  if (host.includes('localhost')) {
    const subdomain = hostParts[0].split(':')[0];

    if (subdomain === 'localhost') {
      // Default tenant for localhost
      return await getOrCreateDefaultTenant();
    }

    // subdomain.localhost format
    return await prisma.tenant.findUnique({
      where: { subdomain },
    });
  }

  if (rootAppHosts.includes(host)) {
    return await getOrCreateDefaultTenant();
  }

  // Production: subdomain.erp.slict.lk or custom domain
  if (hostParts.length >= 3) {
    // Subdomain routing: tenant.erp.slict.lk
    const subdomain = hostParts[0];
    return await prisma.tenant.findUnique({
      where: { subdomain },
    });
  } else {
    // Custom domain routing
    return await prisma.tenant.findUnique({
      where: { domain: host },
    });
  }
}

export async function getTenantById(tenantId: string) {
  return await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
}

export async function getOrCreateDefaultTenant() {
  let tenant = await prisma.tenant.findUnique({
    where: { subdomain: 'demo' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        subdomain: 'demo',
        companyName: 'Demo Company',
        name: 'Demo Tenant',
        status: 'TRIAL',
      },
    });
  }

  return tenant;
}

export function getTenantFromContext(context: any): string | null {
  return context?.tenant?.id || null;
}
