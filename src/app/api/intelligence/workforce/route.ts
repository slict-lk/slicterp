import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import {
  getEmployeeSnapshotHistoryMap,
  getWorkforceDashboardData,
} from '@/lib/intelligence/workforce/capacity-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const [data, history] = await Promise.all([
      getWorkforceDashboardData(prisma, tenant.id),
      getEmployeeSnapshotHistoryMap(prisma, tenant.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          subdomain: tenant.subdomain,
        },
        ...data,
        history,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
