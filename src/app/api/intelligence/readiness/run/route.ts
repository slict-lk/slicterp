import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import { runAndPersistDataReadinessAudit } from '@/lib/intelligence/readiness/readiness-service';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'approve' }, { moduleId: 'ai', action: 'approve' }]);

    const result = await runAndPersistDataReadinessAudit(prisma, tenant.id);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Data readiness audit completed.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
