import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { getActiveConstraints } from '@/lib/intelligence/constraints/constraint-service';
import { listOperationalEvents } from '@/lib/intelligence/events/operational-event-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const [constraints, recentEvents] = await Promise.all([
      getActiveConstraints(prisma, tenant.id),
      listOperationalEvents(prisma, tenant.id, { limit: 12 }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        constraints,
        recentEvents,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
