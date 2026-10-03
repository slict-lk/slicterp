import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateDefaultTenant } from '@/lib/get-tenant';
import { handleApiError } from '@/lib/error-handler';
import {
  getIntelligenceRuntimeStatus,
  runIntelligencePipeline,
  syncIntelligenceAutomationSettings,
} from '@/lib/intelligence/runtime/runtime-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'view' }, { moduleId: 'ai', action: 'view' }]);

    const runtime = await getIntelligenceRuntimeStatus(prisma, tenant.id);

    return NextResponse.json({
      success: true,
      data: runtime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function POST() {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    const user = await requireAnyPermission([{ moduleId: 'intelligence', action: 'approve' }, { moduleId: 'ai', action: 'approve' }]);

    const runtime = await runIntelligencePipeline(prisma, tenant.id, user.id);

    return NextResponse.json({
      success: true,
      data: runtime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const tenant = await getOrCreateDefaultTenant();
    const { requireAnyPermission } = await import('@/lib/auth');
    await requireAnyPermission([{ moduleId: 'intelligence', action: 'edit' }, { moduleId: 'ai', action: 'edit' }]);

    const body = await request.json().catch(() => ({}));
    const settings = await syncIntelligenceAutomationSettings(prisma, tenant.id, {
      autoRunSnapshots:
        typeof body?.autoRunSnapshots === 'boolean' ? body.autoRunSnapshots : undefined,
      autoRunConstraintScan:
        typeof body?.autoRunConstraintScan === 'boolean' ? body.autoRunConstraintScan : undefined,
    });

    return NextResponse.json({
      success: true,
      data: settings,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error as Error);
  }
}
