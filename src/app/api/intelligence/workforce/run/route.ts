import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { generateEmployeeCapacitySnapshots, getWorkforceDashboardData } from '@/lib/intelligence/workforce/capacity-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'approve' }, { moduleId: 'ai', action: 'approve' }]);

    await generateEmployeeCapacitySnapshots(prisma, tenant.id);
    const data = await getWorkforceDashboardData(prisma, tenant.id);

    return NextResponse.json({
      success: true,
      data,
      message: 'Workforce capacity snapshots generated.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
